import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { loadServerEnv } from '@aura/config';
import { prisma } from '@aura/db';

const env = loadServerEnv();

export const SESSION_COOKIE = 'aura_session';
export const CSRF_COOKIE = 'aura_csrf';
const TTL_MS = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

/** Hash a session token before it ever touches the database. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function baseCookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.isProd,
    path: '/',
  };
}

/** Create a session row + set the httpOnly cookie. Returns the session id. */
export async function startSession(
  reply: FastifyReply,
  userId: string,
  meta: { ip?: string; userAgent?: string },
): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TTL_MS);
  const session = await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt, ip: meta.ip, userAgent: meta.userAgent },
  });

  reply.setCookie(SESSION_COOKIE, token, { ...baseCookieOpts(), maxAge: TTL_MS / 1000 });

  // Issue a CSRF token (readable by JS so the client can echo it in a header).
  const csrf = randomBytes(24).toString('base64url');
  reply.setCookie(CSRF_COOKIE, csrf, { ...baseCookieOpts(), httpOnly: false, maxAge: TTL_MS / 1000 });

  return session.id;
}

export function issueCsrf(reply: FastifyReply): string {
  const csrf = randomBytes(24).toString('base64url');
  reply.setCookie(CSRF_COOKIE, csrf, { ...baseCookieOpts(), httpOnly: false, maxAge: TTL_MS / 1000 });
  return csrf;
}

export interface ResolvedSession {
  sessionId: string;
  userId: string;
}

/**
 * Resolve the session from the request cookie. Validates expiry/revocation and
 * lazily refreshes lastUsedAt. Returns null when there is no valid session.
 */
export async function resolveSession(req: FastifyRequest): Promise<ResolvedSession | null> {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;

  // Throttle write churn: only refresh once per hour.
  if (Date.now() - session.lastUsedAt.getTime() > 60 * 60 * 1000) {
    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
  }
  return { sessionId: session.id, userId: session.userId };
}

export async function endSession(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = req.cookies[SESSION_COOKIE];
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
  reply.clearCookie(CSRF_COOKIE, { path: '/' });
}

/** Hash the cookie token the way handshakes do (used by the socket server). */
export function tokenToHash(token: string): string {
  return hashToken(token);
}
