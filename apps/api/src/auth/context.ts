import type { FastifyRequest } from 'fastify';
import { ADMIN_ROLES, type Role } from '@aura/contracts';
import { type User, prisma } from '@aura/db';
import { Forbidden, HttpError, Unauthorized } from '../lib/http-error';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by the auth hook from the session cookie (ids only). */
    auth?: { userId: string; sessionId: string };
    /** Lazily-loaded, request-cached user. */
    _userCache?: User | null;
  }
}

/** Load the current user (cached on the request). Returns null when anonymous. */
export async function getCurrentUser(req: FastifyRequest): Promise<User | null> {
  if (req._userCache !== undefined) return req._userCache;
  if (!req.auth) {
    req._userCache = null;
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
  req._userCache = user;
  return user;
}

/** Require an authenticated, non-banned, approved user. */
export async function requireUser(req: FastifyRequest): Promise<User> {
  const user = await getCurrentUser(req);
  if (!user) throw new Unauthorized();
  if (user.status === 'BANNED') throw new HttpError(403, 'Your account is banned.', 'BANNED');
  if (user.status !== 'ACTIVE') {
    throw new HttpError(403, 'Your account is awaiting approval.', 'NOT_APPROVED');
  }
  return user;
}

export async function requireRole(req: FastifyRequest, roles: Role[]): Promise<User> {
  const user = await requireUser(req);
  if (!roles.includes(user.role as Role)) throw new Forbidden();
  return user;
}

export const requireAdmin = (req: FastifyRequest) => requireRole(req, ADMIN_ROLES);
