import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { BADGE_REGISTRY, ECONOMY, GAME_REGISTRY } from '@aura/contracts';
import { type DbTx, prisma } from './index';

// Self-contained helpers (the seed must not depend on @aura/domain — that would
// create a dependency cycle, since @aura/domain depends on @aura/db).
function dayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ECONOMY.DAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

async function credit(tx: DbTx, userId: string, currency: 'MONEY' | 'AURA', amount: number, reason: string) {
  const balance = await tx.balance.upsert({
    where: { userId_currency: { userId, currency } },
    create: { userId, currency, amount: 0 },
    update: {},
  });
  const balanceAfter = balance.amount + amount;
  await tx.balance.update({ where: { userId_currency: { userId, currency } }, data: { amount: balanceAfter } });
  await tx.ledgerEntry.create({
    data: { userId, currency, amount, balanceAfter, reason, refType: reason === 'SEED' ? null : 'transfer' },
  });
}

/**
 * Mock data for instant local testing.
 *
 * Default password for every seeded account: `Password123`
 *
 *   admin / admin@aura.dev          → SUPERADMIN
 *   nova  / nova@aura.dev           → ACTIVE player (rich, badges, scores)
 *   pixel / pixel@aura.dev          → ACTIVE player
 *   echo  / echo@aura.dev           → ACTIVE player
 *   newbie/ newbie@aura.dev         → PENDING (awaiting approval — try the admin inbox)
 *   probation / probation@aura.dev  → BANNED (see the banned screen)
 */

const PASSWORD = 'Password123';

function refCode(): string {
  return randomUUID().slice(0, 8).toUpperCase();
}

async function main() {
  console.log('🌱  Seeding AuraTracker…');
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // Reset (dev only). Order respects FK constraints via cascade on User.
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auraTransfer.deleteMany(),
    prisma.rewardGrant.deleteMany(),
    prisma.gameScore.deleteMany(),
    prisma.highScore.deleteMany(),
    prisma.ledgerEntry.deleteMany(),
    prisma.balance.deleteMany(),
    prisma.userBadge.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
    prisma.badge.deleteMany(),
  ]);

  // Badge catalog from the registry (single source of truth).
  await prisma.badge.createMany({
    data: BADGE_REGISTRY.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      rarity: b.rarity,
    })),
  });

  async function createUser(input: {
    username: string;
    role?: string;
    status?: string;
    color: string;
    bio?: string;
    money?: number;
    aura?: number;
    banReason?: string;
  }) {
    const user = await prisma.user.create({
      data: {
        username: input.username,
        usernameLower: input.username.toLowerCase(),
        email: `${input.username}@aura.dev`,
        passwordHash,
        firstName: input.username[0]!.toUpperCase() + input.username.slice(1),
        school: 'Lycée Aurora',
        schoolLevel: 'Terminale',
        classLetter: 'A',
        motivation: 'Looking forward to playing!',
        role: input.role ?? 'USER',
        status: input.status ?? 'ACTIVE',
        usernameColor: input.color,
        bio: input.bio ?? null,
        introSeen: true,
        referralCode: refCode(),
        banReason: input.banReason ?? null,
        approvedAt: (input.status ?? 'ACTIVE') === 'ACTIVE' ? new Date() : null,
      },
    });

    if ((input.status ?? 'ACTIVE') === 'ACTIVE') {
      await prisma.$transaction(async (tx) => {
        await credit(tx, user.id, 'MONEY', input.money ?? ECONOMY.STARTING_MONEY, 'SEED');
        await credit(tx, user.id, 'AURA', input.aura ?? ECONOMY.STARTING_AURA, 'SEED');
      });
    }
    return user;
  }

  const admin = await createUser({
    username: 'admin',
    role: 'SUPERADMIN',
    color: '#f43f5e',
    bio: 'Keeping AuraTracker fair and fun.',
    money: 100000,
    aura: 5000,
  });
  const nova = await createUser({
    username: 'nova',
    color: '#a78bfa',
    bio: 'Tile-merging champion. Catch me on the 2048 board.',
    money: 4200,
    aura: 640,
  });
  const pixel = await createUser({
    username: 'pixel',
    color: '#38bdf8',
    bio: 'Snake speedrunner.',
    money: 1850,
    aura: 270,
  });
  const echo = await createUser({
    username: 'echo',
    color: '#34d399',
    bio: 'Here for the leaderboards.',
    money: 980,
    aura: 120,
  });
  await createUser({ username: 'newbie', status: 'PENDING', color: '#fbbf24' });
  await createUser({
    username: 'probation',
    status: 'BANNED',
    color: '#94a3b8',
    banReason: 'Exploiting a reward bug. Ban under appeal.',
  });

  // Auto-award the "First Steps" badge to active players.
  for (const u of [admin, nova, pixel, echo]) {
    await prisma.userBadge.create({ data: { userId: u.id, badgeId: 'first_steps', equipped: true } });
  }
  await prisma.userBadge.createMany({
    data: [
      { userId: nova.id, badgeId: 'tile_master' },
      { userId: nova.id, badgeId: 'first_coin' },
      { userId: nova.id, badgeId: 'aura_magnate' },
      { userId: pixel.id, badgeId: 'snake_charmer' },
      { userId: pixel.id, badgeId: 'first_coin' },
    ],
  });

  // High scores + score history across the playable games.
  const today = dayKey();
  const scoreSeed: Array<[string, string, number]> = [
    [nova.id, '2048', 2048],
    [nova.id, 'snake', 18],
    [nova.id, 'reflex', 22],
    [pixel.id, 'snake', 31],
    [pixel.id, '2048', 768],
    [pixel.id, 'reflex', 15],
    [echo.id, '2048', 512],
    [echo.id, 'snake', 12],
    [admin.id, 'reflex', 9],
  ];
  for (const [userId, gameId, score] of scoreSeed) {
    await prisma.gameScore.create({ data: { userId, gameId, score, isRecord: true, dayKey: today } });
    await prisma.highScore.create({ data: { userId, gameId, bestScore: score } });
  }

  // A friendly aura gift + matching ledger movements.
  await prisma.$transaction(async (tx) => {
    await credit(tx, nova.id, 'AURA', -20, 'TRANSFER_OUT');
    await credit(tx, pixel.id, 'AURA', 20, 'TRANSFER_IN');
    await tx.auraTransfer.create({
      data: { fromUserId: nova.id, toUserId: pixel.id, amount: 20, message: 'gg on that snake run!', dayKey: today },
    });
  });

  // Follows
  await prisma.follow.createMany({
    data: [
      { followerId: pixel.id, followingId: nova.id },
      { followerId: echo.id, followingId: nova.id },
      { followerId: nova.id, followingId: pixel.id },
    ],
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      { userId: nova.id, type: 'BADGE', title: 'Badge unlocked: Tile Master', body: 'Scored 1000+ in 2048.' },
      { userId: nova.id, type: 'TRANSFER', title: 'You sent aura', body: 'You gifted 20 aura to pixel.', readAt: new Date() },
      { userId: pixel.id, type: 'TRANSFER', title: 'You received aura', body: 'nova gifted you 20 aura.' },
      { userId: pixel.id, type: 'SOCIAL', title: 'New follower', body: 'echo started following nova — say hi!' },
    ],
  });

  // Audit log
  await prisma.auditLog.createMany({
    data: [
      { actorId: admin.id, action: 'USER_APPROVE', targetType: 'user', targetId: nova.id, summary: 'Approved nova' },
      { actorId: admin.id, action: 'USER_APPROVE', targetType: 'user', targetId: pixel.id, summary: 'Approved pixel' },
      { actorId: admin.id, action: 'USER_BAN', targetType: 'user', targetId: 'probation', summary: 'Banned probation for reward exploit' },
    ],
  });

  console.log(`✓ Seeded ${GAME_REGISTRY.length} games, ${BADGE_REGISTRY.length} badges, 6 users.`);
  console.log('  Log in with  admin / Password123  (or nova, pixel, echo).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
