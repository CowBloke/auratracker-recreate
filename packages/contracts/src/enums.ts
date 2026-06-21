import { z } from 'zod';

/**
 * String-typed enums. The DB stores these as plain strings (Postgres-portable,
 * SQLite-friendly); these Zod enums are the single enforcement point so an
 * invalid state can never enter the system through an API boundary.
 */

export const Role = z.enum(['USER', 'BETA', 'ADMIN', 'SUPERADMIN', 'FISCAL', 'JUDGE']);
export type Role = z.infer<typeof Role>;

/** Roles that may use the admin surface. */
export const ADMIN_ROLES: Role[] = ['ADMIN', 'SUPERADMIN'];

export const UserStatus = z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'BANNED']);
export type UserStatus = z.infer<typeof UserStatus>;

export const Currency = z.enum(['MONEY', 'AURA']);
export type Currency = z.infer<typeof Currency>;

export const LedgerReason = z.enum([
  'REWARD',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'ADMIN_GRANT',
  'PURCHASE',
  'SEED',
]);
export type LedgerReason = z.infer<typeof LedgerReason>;

export const NotificationType = z.enum([
  'REWARD',
  'TRANSFER',
  'BADGE',
  'ADMIN',
  'SYSTEM',
  'SOCIAL',
]);
export type NotificationType = z.infer<typeof NotificationType>;

export const GameCategory = z.enum(['SINGLEPLAYER', 'MULTIPLAYER']);
export type GameCategory = z.infer<typeof GameCategory>;

export const GameStatus = z.enum(['LIVE', 'BETA', 'NEW', 'SOON']);
export type GameStatus = z.infer<typeof GameStatus>;

export const BadgeRarity = z.enum(['common', 'rare', 'epic', 'legendary']);
export type BadgeRarity = z.infer<typeof BadgeRarity>;

export const AuditAction = z.enum([
  'USER_APPROVE',
  'USER_REJECT',
  'USER_BAN',
  'USER_UNBAN',
  'ROLE_CHANGE',
  'AURA_GRANT',
  'MONEY_GRANT',
]);
export type AuditAction = z.infer<typeof AuditAction>;
