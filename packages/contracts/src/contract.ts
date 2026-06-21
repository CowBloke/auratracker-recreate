import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  AdminUserView,
  ApiError,
  AuditLogView,
  BadgeView,
  BalancesSchema,
  BanInput,
  ChangePasswordInput,
  GameStateView,
  GrantInput,
  LeaderboardView,
  LedgerEntryView,
  LoginInput,
  NotificationView,
  PublicProfile,
  RegisterInput,
  RoleInput,
  SessionUser,
  SubmitScoreInput,
  SubmitScoreResult,
  TransferInput,
  TransferResult,
  UpdateProfileInput,
  UserSearchResult,
} from './schemas';

const c = initContract();

const errors = {
  400: ApiError,
  401: ApiError,
  403: ApiError,
  404: ApiError,
  409: ApiError,
  429: ApiError,
} as const;

export const contract = c.router(
  {
    // ── Auth ─────────────────────────────────────────────────────────────────
    auth: c.router({
      register: {
        method: 'POST',
        path: '/auth/register',
        body: RegisterInput,
        responses: { 201: z.object({ message: z.string(), status: z.string() }), ...errors },
        summary: 'Register a new account (enters pending-approval state).',
      },
      login: {
        method: 'POST',
        path: '/auth/login',
        body: LoginInput,
        responses: { 200: SessionUser, ...errors },
        summary: 'Log in; sets an httpOnly session cookie.',
      },
      logout: {
        method: 'POST',
        path: '/auth/logout',
        body: z.object({}).optional(),
        responses: { 200: z.object({ ok: z.literal(true) }), ...errors },
      },
      me: {
        method: 'GET',
        path: '/auth/me',
        responses: { 200: SessionUser, ...errors },
        summary: 'Current session user.',
      },
      csrf: {
        method: 'GET',
        path: '/auth/csrf',
        responses: { 200: z.object({ token: z.string() }) },
        summary: 'Issue a CSRF token (also set as a readable cookie).',
      },
      changePassword: {
        method: 'POST',
        path: '/auth/password',
        body: ChangePasswordInput,
        responses: { 200: z.object({ ok: z.literal(true) }), ...errors },
      },
    }),

    // ── Users / profiles ───────────────────────────────────────────────────────
    users: c.router({
      search: {
        method: 'GET',
        path: '/users/search',
        query: z.object({ q: z.string().min(1).max(40) }),
        responses: { 200: z.array(UserSearchResult), ...errors },
      },
      profile: {
        method: 'GET',
        path: '/users/:id',
        responses: { 200: PublicProfile, ...errors },
      },
      updateMe: {
        method: 'PATCH',
        path: '/users/me',
        body: UpdateProfileInput,
        responses: { 200: SessionUser, ...errors },
      },
      follow: {
        method: 'POST',
        path: '/users/:id/follow',
        body: z.object({}).optional(),
        responses: { 200: z.object({ following: z.boolean() }), ...errors },
      },
      unfollow: {
        method: 'DELETE',
        path: '/users/:id/follow',
        responses: { 200: z.object({ following: z.boolean() }), ...errors },
      },
    }),

    // ── Economy ─────────────────────────────────────────────────────────────────
    economy: c.router({
      balances: {
        method: 'GET',
        path: '/economy/balances',
        responses: { 200: BalancesSchema, ...errors },
      },
      history: {
        method: 'GET',
        path: '/economy/history',
        query: z.object({
          cursor: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(100).default(30),
        }),
        responses: {
          200: z.object({ entries: z.array(LedgerEntryView), nextCursor: z.string().nullable() }),
          ...errors,
        },
      },
      transfer: {
        method: 'POST',
        path: '/economy/transfer',
        body: TransferInput,
        responses: { 200: TransferResult, ...errors },
        summary: 'Gift aura to another user (subject to a daily sender cap).',
      },
    }),

    // ── Games & rewards ──────────────────────────────────────────────────────────
    games: c.router({
      state: {
        method: 'GET',
        path: '/games/state',
        responses: { 200: GameStateView, ...errors },
        summary: 'Per-user high scores + today’s reward totals.',
      },
      submitScore: {
        method: 'POST',
        path: '/games/:id/score',
        body: SubmitScoreInput,
        responses: { 200: SubmitScoreResult, ...errors },
        summary: 'Submit a finished run; grants capped rewards idempotently.',
      },
      leaderboard: {
        method: 'GET',
        path: '/games/:id/leaderboard',
        responses: { 200: LeaderboardView, ...errors },
      },
    }),

    // ── Leaderboards ────────────────────────────────────────────────────────────
    leaderboards: c.router({
      get: {
        method: 'GET',
        path: '/leaderboards/:board', // money | aura | overall
        responses: { 200: LeaderboardView, ...errors },
      },
    }),

    // ── Badges ──────────────────────────────────────────────────────────────────
    badges: c.router({
      mine: {
        method: 'GET',
        path: '/badges',
        responses: { 200: z.array(BadgeView), ...errors },
      },
    }),

    // ── Notifications ────────────────────────────────────────────────────────────
    notifications: c.router({
      list: {
        method: 'GET',
        path: '/notifications',
        responses: { 200: z.array(NotificationView), ...errors },
      },
      unreadCount: {
        method: 'GET',
        path: '/notifications/unread-count',
        responses: { 200: z.object({ count: z.number().int() }), ...errors },
      },
      markRead: {
        method: 'POST',
        path: '/notifications/read',
        body: z.object({ ids: z.array(z.string()).optional(), all: z.boolean().optional() }),
        responses: { 200: z.object({ ok: z.literal(true) }), ...errors },
      },
    }),

    // ── Admin / governance ────────────────────────────────────────────────────────
    admin: c.router({
      pendingUsers: {
        method: 'GET',
        path: '/admin/pending-users',
        responses: { 200: z.array(AdminUserView), ...errors },
      },
      listUsers: {
        method: 'GET',
        path: '/admin/users',
        query: z.object({ q: z.string().optional() }),
        responses: { 200: z.array(AdminUserView), ...errors },
      },
      approve: {
        method: 'POST',
        path: '/admin/users/:id/approve',
        body: z.object({}).optional(),
        responses: { 200: AdminUserView, ...errors },
      },
      reject: {
        method: 'POST',
        path: '/admin/users/:id/reject',
        body: z.object({}).optional(),
        responses: { 200: AdminUserView, ...errors },
      },
      ban: {
        method: 'POST',
        path: '/admin/users/:id/ban',
        body: BanInput,
        responses: { 200: AdminUserView, ...errors },
      },
      unban: {
        method: 'POST',
        path: '/admin/users/:id/unban',
        body: z.object({}).optional(),
        responses: { 200: AdminUserView, ...errors },
      },
      setRole: {
        method: 'POST',
        path: '/admin/users/:id/role',
        body: RoleInput,
        responses: { 200: AdminUserView, ...errors },
      },
      grant: {
        method: 'POST',
        path: '/admin/users/:id/grant',
        body: GrantInput,
        responses: { 200: z.object({ balances: BalancesSchema }), ...errors },
      },
      audit: {
        method: 'GET',
        path: '/admin/audit',
        query: z.object({ limit: z.coerce.number().int().min(1).max(200).default(60) }),
        responses: { 200: z.array(AuditLogView), ...errors },
      },
    }),
  },
  {
    // NOTE: the '/api' prefix is applied by the server (register prefix) and the
    // client (baseUrl), NOT here — a contract-level pathPrefix widens the path
    // type to `string` and breaks ts-rest's `:param` type inference.
    commonResponses: { 500: ApiError },
  },
);

export type Contract = typeof contract;
