import type { Server as HttpServer } from 'node:http';
import { loadServerEnv } from '@aura/config';
import { prisma } from '@aura/db';
import { Server } from 'socket.io';
import { tokenToHash } from '../auth/session';
import { SESSION_COOKIE } from '../auth/session';
import { bindSocketServer, markOffline, markOnline, presenceCount, userRoom } from './emitter';

const env = loadServerEnv();

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

async function userIdFromCookies(cookieHeader?: string): Promise<string | null> {
  const token = parseCookies(cookieHeader)[SESSION_COOKIE];
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: tokenToHash(token) } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  return session.userId;
}

/** Attach the realtime layer. Authenticated via the same session cookie as REST. */
export function attachSockets(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.WEB_ORIGIN, credentials: true },
    serveClient: false,
  });

  // Track concurrent sockets per user so presence is accurate across tabs.
  const socketsByUser = new Map<string, Set<string>>();

  io.use(async (socket, next) => {
    const userId = await userIdFromCookies(socket.handshake.headers.cookie);
    if (!userId) return next(new Error('unauthorized'));
    socket.data.userId = userId;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(userRoom(userId));

    let set = socketsByUser.get(userId);
    if (!set) {
      set = new Set();
      socketsByUser.set(userId, set);
    }
    const firstConnection = set.size === 0;
    set.add(socket.id);
    if (firstConnection) markOnline(userId);

    socket.emit('presence', { online: presenceCount() });

    socket.on('disconnect', () => {
      const s = socketsByUser.get(userId);
      if (!s) return;
      s.delete(socket.id);
      if (s.size === 0) {
        socketsByUser.delete(userId);
        markOffline(userId);
      }
    });
  });

  bindSocketServer(io);
  return io;
}
