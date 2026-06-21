import type { Balance, LedgerEntry, Notification, User, UserBadge } from '@aura/db';
import { BADGE_REGISTRY } from '@aura/contracts';
import type {
  BadgeView,
  LedgerEntryView,
  NotificationView,
  SessionUser,
} from '@aura/contracts';

const BADGE_META = new Map(BADGE_REGISTRY.map((b) => [b.id, b]));

export function balancesOf(rows: Pick<Balance, 'currency' | 'amount'>[]) {
  const money = rows.find((b) => b.currency === 'MONEY')?.amount ?? 0;
  const aura = rows.find((b) => b.currency === 'AURA')?.amount ?? 0;
  return { money, aura };
}

export function toSessionUser(
  user: User,
  balances: Pick<Balance, 'currency' | 'amount'>[],
): SessionUser {
  return {
    id: user.id,
    username: user.username,
    usernameColor: user.usernameColor,
    email: user.email,
    firstName: user.firstName,
    role: user.role as SessionUser['role'],
    status: user.status as SessionUser['status'],
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    bio: user.bio,
    introSeen: user.introSeen,
    createdAt: user.createdAt.toISOString(),
    balances: balancesOf(balances),
  };
}

export function toLedgerView(e: LedgerEntry): LedgerEntryView {
  return {
    id: e.id,
    currency: e.currency as LedgerEntryView['currency'],
    amount: e.amount,
    balanceAfter: e.balanceAfter,
    reason: e.reason as LedgerEntryView['reason'],
    refType: e.refType,
    refId: e.refId,
    createdAt: e.createdAt.toISOString(),
  };
}

export function toNotificationView(n: Notification): NotificationView {
  let data: Record<string, unknown> | null = null;
  if (n.data) {
    try {
      data = JSON.parse(n.data);
    } catch {
      data = null;
    }
  }
  return {
    id: n.id,
    type: n.type as NotificationView['type'],
    title: n.title,
    body: n.body,
    data,
    read: n.readAt != null,
    createdAt: n.createdAt.toISOString(),
  };
}

/** Build the full badge catalog view, flagging which ones a user owns/equips. */
export function toBadgeViews(owned: UserBadge[]): BadgeView[] {
  const ownedMap = new Map(owned.map((b) => [b.badgeId, b]));
  return BADGE_REGISTRY.map((def) => {
    const mine = ownedMap.get(def.id);
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      rarity: def.rarity,
      owned: !!mine,
      equipped: mine?.equipped ?? false,
      awardedAt: mine?.awardedAt.toISOString() ?? null,
    };
  });
}
