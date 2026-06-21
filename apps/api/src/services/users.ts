import type { PublicProfile, UpdateProfileInput } from '@aura/contracts';
import { type User, prisma } from '@aura/db';
import { NotFound } from '../lib/http-error';
import { balancesOf, toBadgeViews } from '../lib/serialize';
import { notify } from './notify';

export async function searchUsers(query: string, excludeId: string) {
  const users = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      id: { not: excludeId },
      usernameLower: { contains: query.toLowerCase() },
    },
    take: 8,
    orderBy: { username: 'asc' },
  });
  return users.map((u) => ({
    id: u.id,
    username: u.username,
    usernameColor: u.usernameColor,
    avatarUrl: u.avatarUrl,
  }));
}

export async function buildPublicProfile(targetId: string, meId: string): Promise<PublicProfile> {
  const user = await prisma.user.findUnique({
    where: { id: targetId },
    include: { balances: true, badges: true, highScores: true },
  });
  if (!user || user.status === 'REJECTED') throw new NotFound('User not found.');

  const balances = balancesOf(user.balances);

  const [followerCount, followingCount, isFollowing, higherRanked] = await Promise.all([
    prisma.follow.count({ where: { followingId: targetId } }),
    prisma.follow.count({ where: { followerId: targetId } }),
    meId === targetId
      ? Promise.resolve(false)
      : prisma.follow
          .findUnique({ where: { followerId_followingId: { followerId: meId, followingId: targetId } } })
          .then(Boolean),
    // Overall rank = number of active users with a strictly higher (money+5*aura) score, +1.
    rankOf(targetId),
  ]);

  return {
    id: user.id,
    username: user.username,
    usernameColor: user.usernameColor,
    role: user.role as PublicProfile['role'],
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    bio: user.bio,
    createdAt: user.createdAt.toISOString(),
    money: balances.money,
    aura: balances.aura,
    overallRank: higherRanked,
    followerCount,
    followingCount,
    isFollowing,
    badges: toBadgeViews(user.badges).filter((b) => b.owned),
    highScores: user.highScores.map((h) => ({ gameId: h.gameId, bestScore: h.bestScore })),
  };
}

async function rankOf(userId: string): Promise<number | null> {
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    include: { balances: true },
  });
  const scored = users
    .map((u) => ({
      id: u.id,
      score:
        (u.balances.find((b) => b.currency === 'MONEY')?.amount ?? 0) +
        (u.balances.find((b) => b.currency === 'AURA')?.amount ?? 0) * 5,
    }))
    .sort((a, b) => b.score - a.score);
  const idx = scored.findIndex((s) => s.id === userId);
  return idx === -1 ? null : idx + 1;
}

export async function updateProfile(user: User, input: UpdateProfileInput) {
  return prisma.user.update({
    where: { id: user.id },
    data: {
      bio: input.bio === undefined ? undefined : input.bio,
      usernameColor: input.usernameColor,
      avatarUrl: input.avatarUrl === undefined ? undefined : input.avatarUrl,
      bannerUrl: input.bannerUrl === undefined ? undefined : input.bannerUrl,
    },
  });
}

export async function toggleFollow(me: User, targetId: string, follow: boolean): Promise<boolean> {
  if (targetId === me.id) return false;
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target || target.status !== 'ACTIVE') throw new NotFound('User not found.');

  const where = { followerId_followingId: { followerId: me.id, followingId: targetId } };
  if (follow) {
    await prisma.follow.upsert({
      where,
      create: { followerId: me.id, followingId: targetId },
      update: {},
    });
    await notify(targetId, {
      type: 'SOCIAL',
      title: `${me.username} started following you`,
      data: { followerId: me.id },
    });
    return true;
  }
  await prisma.follow.deleteMany({ where: { followerId: me.id, followingId: targetId } });
  return false;
}
