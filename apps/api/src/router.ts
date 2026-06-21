import { contract } from '@aura/contracts';
import { prisma } from '@aura/db';
import { initServer } from '@ts-rest/fastify';
import { getCurrentUser, requireAdmin, requireUser } from './auth/context';
import {
  clearLoginAttempts,
  isLoginLocked,
  registerFailedLogin,
} from './auth/passwords';
import { endSession, issueCsrf, startSession } from './auth/session';
import { Unauthorized } from './lib/http-error';
import { sessionUserPayload } from './lib/session-user';
import { toLedgerView } from './lib/serialize';
import * as admin from './services/admin';
import { authenticate, changePassword, registerUser } from './services/auth';
import { getBalances, transferAura } from './services/economy';
import { getGameState, submitScore } from './services/games';
import { resolveBoard, gameBoard } from './services/leaderboards';
import { listNotifications, markRead, unreadCount } from './services/notifications';
import { TooMany } from './lib/http-error';
import { buildPublicProfile, searchUsers, toggleFollow, updateProfile } from './services/users';
import { toBadgeViews } from './lib/serialize';

const s = initServer();

// This @ts-rest/fastify version exposes path params on `request.params` rather
// than as a top-level handler arg, so we read them through this typed helper.
const pp = (request: import('fastify').FastifyRequest) =>
  request.params as { id: string; board: string };

export const router = s.router(contract, {
  auth: {
    register: async ({ body }) => {
      await registerUser(body);
      return {
        status: 201,
        body: { message: 'Account created — an admin will review it shortly.', status: 'PENDING' },
      };
    },

    login: async ({ body, request, reply }) => {
      const key = `${request.ip}:${body.identifier.toLowerCase()}`;
      if (isLoginLocked(key)) throw new TooMany('Too many attempts. Try again in a few minutes.');
      try {
        const user = await authenticate(body.identifier, body.password);
        clearLoginAttempts(key);
        await startSession(reply, user.id, {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return { status: 200, body: await sessionUserPayload(user) };
      } catch (err) {
        registerFailedLogin(key);
        throw err;
      }
    },

    logout: async ({ request, reply }) => {
      await endSession(request, reply);
      return { status: 200, body: { ok: true } };
    },

    me: async ({ request }) => {
      const user = await getCurrentUser(request);
      if (!user) throw new Unauthorized();
      return { status: 200, body: await sessionUserPayload(user) };
    },

    csrf: async ({ reply }) => {
      return { status: 200, body: { token: issueCsrf(reply) } };
    },

    changePassword: async ({ body, request }) => {
      const user = await requireUser(request);
      await changePassword(user, body.currentPassword, body.newPassword);
      return { status: 200, body: { ok: true } };
    },
  },

  users: {
    search: async ({ query, request }) => {
      const me = await requireUser(request);
      return { status: 200, body: await searchUsers(query.q, me.id) };
    },
    profile: async ({ request }) => {
      const me = await requireUser(request);
      return { status: 200, body: await buildPublicProfile(pp(request).id, me.id) };
    },
    updateMe: async ({ body, request }) => {
      const me = await requireUser(request);
      const updated = await updateProfile(me, body);
      return { status: 200, body: await sessionUserPayload(updated) };
    },
    follow: async ({ request }) => {
      const me = await requireUser(request);
      return { status: 200, body: { following: await toggleFollow(me, pp(request).id, true) } };
    },
    unfollow: async ({ request }) => {
      const me = await requireUser(request);
      return { status: 200, body: { following: await toggleFollow(me, pp(request).id, false) } };
    },
  },

  economy: {
    balances: async ({ request }) => {
      const me = await requireUser(request);
      return { status: 200, body: await getBalances(me.id) };
    },
    history: async ({ query, request }) => {
      const me = await requireUser(request);
      const entries = await prisma.ledgerEntry.findMany({
        where: { userId: me.id },
        orderBy: { createdAt: 'desc' },
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      });
      const hasMore = entries.length > query.limit;
      const page = hasMore ? entries.slice(0, query.limit) : entries;
      return {
        status: 200,
        body: {
          entries: page.map(toLedgerView),
          nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
        },
      };
    },
    transfer: async ({ body, request }) => {
      const me = await requireUser(request);
      return { status: 200, body: await transferAura(me, body.toUserId, body.amount, body.message) };
    },
  },

  games: {
    state: async ({ request }) => {
      const me = await requireUser(request);
      return { status: 200, body: await getGameState(me.id) };
    },
    submitScore: async ({ body, request }) => {
      const me = await requireUser(request);
      return { status: 200, body: await submitScore(me, pp(request).id, body.score, body.runId) };
    },
    leaderboard: async ({ request }) => {
      const me = await requireUser(request);
      return { status: 200, body: await gameBoard(pp(request).id, me.id) };
    },
  },

  leaderboards: {
    get: async ({ request }) => {
      const me = await requireUser(request);
      return { status: 200, body: await resolveBoard(pp(request).board, me.id) };
    },
  },

  badges: {
    mine: async ({ request }) => {
      const me = await requireUser(request);
      const owned = await prisma.userBadge.findMany({ where: { userId: me.id } });
      return { status: 200, body: toBadgeViews(owned) };
    },
  },

  notifications: {
    list: async ({ request }) => {
      const me = await requireUser(request);
      return { status: 200, body: await listNotifications(me.id) };
    },
    unreadCount: async ({ request }) => {
      const me = await requireUser(request);
      return { status: 200, body: { count: await unreadCount(me.id) } };
    },
    markRead: async ({ body, request }) => {
      const me = await requireUser(request);
      await markRead(me.id, body);
      return { status: 200, body: { ok: true } };
    },
  },

  admin: {
    pendingUsers: async ({ request }) => {
      await requireAdmin(request);
      return { status: 200, body: await admin.listPending() };
    },
    listUsers: async ({ query, request }) => {
      await requireAdmin(request);
      return { status: 200, body: await admin.listUsers(query.q) };
    },
    approve: async ({ request }) => {
      const me = await requireAdmin(request);
      return { status: 200, body: await admin.approveUser(me, pp(request).id, request.ip) };
    },
    reject: async ({ request }) => {
      const me = await requireAdmin(request);
      return { status: 200, body: await admin.rejectUser(me, pp(request).id, request.ip) };
    },
    ban: async ({ body, request }) => {
      const me = await requireAdmin(request);
      return { status: 200, body: await admin.banUser(me, pp(request).id, body.reason, request.ip) };
    },
    unban: async ({ request }) => {
      const me = await requireAdmin(request);
      return { status: 200, body: await admin.unbanUser(me, pp(request).id, request.ip) };
    },
    setRole: async ({ body, request }) => {
      const me = await requireAdmin(request);
      return { status: 200, body: await admin.setRole(me, pp(request).id, body.role, request.ip) };
    },
    grant: async ({ body, request }) => {
      const me = await requireAdmin(request);
      return {
        status: 200,
        body: await admin.grant(me, pp(request).id, body.currency, body.amount, body.note, request.ip),
      };
    },
    audit: async ({ query, request }) => {
      await requireAdmin(request);
      return { status: 200, body: await admin.listAudit(query.limit) };
    },
  },
});

export type AppRouter = typeof router;

/** Register the contract-typed routes onto a Fastify instance under /api. */
export async function registerApi(app: import('fastify').FastifyInstance): Promise<void> {
  await app.register(s.plugin(router), { prefix: '/api' });
}
