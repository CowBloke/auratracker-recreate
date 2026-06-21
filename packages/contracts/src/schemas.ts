import { z } from 'zod';
import {
  BadgeRarity,
  Currency,
  LedgerReason,
  NotificationType,
  Role,
  UserStatus,
} from './enums';

/** Timestamps cross the wire as ISO strings. */
export const isoDate = z.string();

// ── Auth & users ─────────────────────────────────────────────────────────────

export const usernameSchema = z
  .string()
  .min(3, 'At least 3 characters')
  .max(20, 'At most 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers and underscores only');

export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(200)
  .regex(/[a-z]/, 'Needs a lowercase letter')
  .regex(/[A-Z]/, 'Needs an uppercase letter')
  .regex(/[0-9]/, 'Needs a number');

export const RegisterInput = z.object({
  username: usernameSchema,
  email: z.string().email(),
  password: passwordSchema,
  firstName: z.string().min(1).max(60),
  school: z.string().max(120).optional(),
  schoolLevel: z.string().max(60).optional(),
  classLetter: z.string().max(10).optional(),
  motivation: z.string().max(500).optional(),
  referralCode: z.string().max(40).optional(),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const LoginInput = z.object({
  identifier: z.string().min(1), // username or email
  password: z.string().min(1),
});

export const ChangePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const BalancesSchema = z.object({
  money: z.number().int(),
  aura: z.number().int(),
});

export const SessionUser = z.object({
  id: z.string(),
  username: z.string(),
  usernameColor: z.string(),
  email: z.string(),
  firstName: z.string(),
  role: Role,
  status: UserStatus,
  avatarUrl: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  bio: z.string().nullable(),
  introSeen: z.boolean(),
  createdAt: isoDate,
  balances: BalancesSchema,
});
export type SessionUser = z.infer<typeof SessionUser>;

export const UpdateProfileInput = z.object({
  bio: z.string().max(280).nullable().optional(),
  usernameColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex colour')
    .optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
});

export const BadgeView = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  rarity: BadgeRarity,
  owned: z.boolean(),
  equipped: z.boolean(),
  awardedAt: isoDate.nullable(),
});

export const PublicProfile = z.object({
  id: z.string(),
  username: z.string(),
  usernameColor: z.string(),
  role: Role,
  avatarUrl: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  bio: z.string().nullable(),
  createdAt: isoDate,
  money: z.number().int(),
  aura: z.number().int(),
  overallRank: z.number().int().nullable(),
  followerCount: z.number().int(),
  followingCount: z.number().int(),
  isFollowing: z.boolean(),
  badges: z.array(BadgeView),
  highScores: z.array(z.object({ gameId: z.string(), bestScore: z.number().int() })),
});

export const UserSearchResult = z.object({
  id: z.string(),
  username: z.string(),
  usernameColor: z.string(),
  avatarUrl: z.string().nullable(),
});

// ── Economy ──────────────────────────────────────────────────────────────────

export const LedgerEntryView = z.object({
  id: z.string(),
  currency: Currency,
  amount: z.number().int(),
  balanceAfter: z.number().int(),
  reason: LedgerReason,
  refType: z.string().nullable(),
  refId: z.string().nullable(),
  createdAt: isoDate,
});

export const TransferInput = z.object({
  toUserId: z.string().min(1),
  amount: z.number().int().positive(),
  message: z.string().max(200).optional(),
});

export const TransferResult = z.object({
  transferId: z.string(),
  balances: BalancesSchema,
  remainingDailyAllowance: z.number().int(),
});

// ── Games & rewards ──────────────────────────────────────────────────────────

export const GameStateView = z.object({
  highScores: z.array(z.object({ gameId: z.string(), bestScore: z.number().int() })),
  daily: z.object({
    moneyToday: z.number().int(),
    auraToday: z.number().int(),
    moneyCap: z.number().int(),
    auraCap: z.number().int(),
  }),
});

export const SubmitScoreInput = z.object({
  score: z.number().int().nonnegative().max(10_000_000),
  /** Idempotency key so a double-submitted run grants the reward only once. */
  runId: z.string().min(8).max(64),
});

export const SubmitScoreResult = z.object({
  score: z.number().int(),
  isRecord: z.boolean(),
  bestScore: z.number().int(),
  reward: z.object({
    money: z.number().int(),
    aura: z.number().int(),
    cappedByDaily: z.boolean(),
  }),
  balances: BalancesSchema,
  newBadges: z.array(BadgeView),
});

export const LeaderboardEntry = z.object({
  rank: z.number().int(),
  userId: z.string(),
  username: z.string(),
  usernameColor: z.string(),
  avatarUrl: z.string().nullable(),
  value: z.number().int(),
  isMe: z.boolean(),
});

export const LeaderboardView = z.object({
  board: z.string(),
  entries: z.array(LeaderboardEntry),
  me: LeaderboardEntry.nullable(),
});

// ── Notifications ────────────────────────────────────────────────────────────

export const NotificationView = z.object({
  id: z.string(),
  type: NotificationType,
  title: z.string(),
  body: z.string().nullable(),
  data: z.record(z.unknown()).nullable(),
  read: z.boolean(),
  createdAt: isoDate,
});

// ── Admin ────────────────────────────────────────────────────────────────────

export const AdminUserView = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  firstName: z.string(),
  school: z.string().nullable(),
  schoolLevel: z.string().nullable(),
  classLetter: z.string().nullable(),
  motivation: z.string().nullable(),
  role: Role,
  status: UserStatus,
  money: z.number().int(),
  aura: z.number().int(),
  createdAt: isoDate,
  approvedAt: isoDate.nullable(),
});

export const AuditLogView = z.object({
  id: z.string(),
  actorId: z.string().nullable(),
  actorUsername: z.string().nullable(),
  action: z.string(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  summary: z.string(),
  createdAt: isoDate,
});

export const GrantInput = z.object({
  currency: Currency,
  amount: z.number().int(),
  note: z.string().max(200).optional(),
});

export const BanInput = z.object({ reason: z.string().min(1).max(280) });
export const RoleInput = z.object({ role: Role });

// ── Shared error shape ───────────────────────────────────────────────────────

export const ApiError = z.object({
  message: z.string(),
  code: z.string().optional(),
  fields: z.record(z.string()).optional(),
});
export type ApiError = z.infer<typeof ApiError>;

// ── Inferred types (a value + type may share a name in TS) ───────────────────
export type LoginInput = z.infer<typeof LoginInput>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordInput>;
export type Balances = z.infer<typeof BalancesSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>;
export type BadgeView = z.infer<typeof BadgeView>;
export type PublicProfile = z.infer<typeof PublicProfile>;
export type UserSearchResult = z.infer<typeof UserSearchResult>;
export type LedgerEntryView = z.infer<typeof LedgerEntryView>;
export type TransferInput = z.infer<typeof TransferInput>;
export type TransferResult = z.infer<typeof TransferResult>;
export type GameStateView = z.infer<typeof GameStateView>;
export type SubmitScoreInput = z.infer<typeof SubmitScoreInput>;
export type SubmitScoreResult = z.infer<typeof SubmitScoreResult>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntry>;
export type LeaderboardView = z.infer<typeof LeaderboardView>;
export type NotificationView = z.infer<typeof NotificationView>;
export type AdminUserView = z.infer<typeof AdminUserView>;
export type AuditLogView = z.infer<typeof AuditLogView>;
export type GrantInput = z.infer<typeof GrantInput>;
export type BanInput = z.infer<typeof BanInput>;
export type RoleInput = z.infer<typeof RoleInput>;
