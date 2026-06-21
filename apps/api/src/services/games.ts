import { ECONOMY, type SubmitScoreResult, getGame, isPlayableGame } from '@aura/contracts';
import { type User, prisma } from '@aura/db';
import { applyLedger, computeRunReward, dayKey, evaluateNewBadges } from '@aura/domain';
import { BadRequest, NotFound } from '../lib/http-error';
import { balancesOf, toBadgeViews } from '../lib/serialize';
import { notify } from './notify';

/** Today's reward totals + the configured caps, for the games dashboard. */
export async function getGameState(userId: string) {
  const today = dayKey();
  const [highScores, grants] = await Promise.all([
    prisma.highScore.findMany({ where: { userId }, select: { gameId: true, bestScore: true } }),
    prisma.rewardGrant.groupBy({
      by: ['currency'],
      where: { userId, dayKey: today },
      _sum: { amount: true },
    }),
  ]);
  const moneyToday = grants.find((g) => g.currency === 'MONEY')?._sum.amount ?? 0;
  const auraToday = grants.find((g) => g.currency === 'AURA')?._sum.amount ?? 0;
  return {
    highScores,
    daily: {
      moneyToday,
      auraToday,
      moneyCap: ECONOMY.DAILY_MONEY_CAP,
      auraCap: ECONOMY.DAILY_AURA_CAP,
    },
  };
}

export async function submitScore(
  user: User,
  gameId: string,
  score: number,
  runId: string,
): Promise<SubmitScoreResult> {
  const game = getGame(gameId);
  if (!game) throw new NotFound('Unknown game.');
  if (!isPlayableGame(gameId)) throw new BadRequest('This game is not playable yet.');

  const today = dayKey();

  // Remaining daily allowance from already-granted rewards.
  const grants = await prisma.rewardGrant.groupBy({
    by: ['currency'],
    where: { userId: user.id, dayKey: today },
    _sum: { amount: true },
  });
  const moneyToday = grants.find((g) => g.currency === 'MONEY')?._sum.amount ?? 0;
  const auraToday = grants.find((g) => g.currency === 'AURA')?._sum.amount ?? 0;
  const remaining = {
    money: Math.max(0, ECONOMY.DAILY_MONEY_CAP - moneyToday),
    aura: Math.max(0, ECONOMY.DAILY_AURA_CAP - auraToday),
  };

  const reward = computeRunReward(game.reward, score, remaining);

  const { isRecord, bestScore, balances } = await prisma.$transaction(async (tx) => {
    const prevHigh = await tx.highScore.findUnique({
      where: { userId_gameId: { userId: user.id, gameId } },
    });
    const record = !prevHigh || score > prevHigh.bestScore;
    const best = record ? score : prevHigh!.bestScore;

    await tx.gameScore.create({
      data: { userId: user.id, gameId, score, isRecord: record, dayKey: today },
    });
    if (record) {
      await tx.highScore.upsert({
        where: { userId_gameId: { userId: user.id, gameId } },
        create: { userId: user.id, gameId, bestScore: score },
        update: { bestScore: score, achievedAt: new Date() },
      });
    }

    if (reward.money > 0) {
      const res = await applyLedger(tx, {
        userId: user.id,
        currency: 'MONEY',
        amount: reward.money,
        reason: 'REWARD',
        refType: 'game',
        refId: gameId,
        idempotencyKey: `reward:${runId}:money`,
      });
      if (!res.idempotentReplay) {
        await tx.rewardGrant.create({
          data: { userId: user.id, gameId, currency: 'MONEY', amount: reward.money, dayKey: today },
        });
      }
    }
    if (reward.aura > 0) {
      const res = await applyLedger(tx, {
        userId: user.id,
        currency: 'AURA',
        amount: reward.aura,
        reason: 'REWARD',
        refType: 'game',
        refId: gameId,
        idempotencyKey: `reward:${runId}:aura`,
      });
      if (!res.idempotentReplay) {
        await tx.rewardGrant.create({
          data: { userId: user.id, gameId, currency: 'AURA', amount: reward.aura, dayKey: today },
        });
      }
    }

    const balances = balancesOf(await tx.balance.findMany({ where: { userId: user.id } }));
    return { isRecord: record, bestScore: best, balances };
  });

  // Badge evaluation against fresh, post-reward state.
  const newBadges = await awardBadges(user.id, balances.aura);

  if (isRecord && score >= game.reward.minScore) {
    await notify(user.id, {
      type: 'REWARD',
      title: `New ${game.name} record: ${score}`,
      body:
        reward.money || reward.aura
          ? `You earned ${reward.money} money and ${reward.aura} aura.`
          : undefined,
      data: { gameId, score },
    });
  }

  return {
    score,
    isRecord,
    bestScore,
    reward: { money: reward.money, aura: reward.aura, cappedByDaily: reward.cappedByDaily },
    balances,
    newBadges,
  };
}

/** Evaluate + persist any newly-earned badges; returns the full badge catalog view. */
async function awardBadges(userId: string, aura: number) {
  const [owned, grantCount, gamesPlayed, highScores] = await Promise.all([
    prisma.userBadge.findMany({ where: { userId } }),
    prisma.rewardGrant.count({ where: { userId } }),
    prisma.gameScore.count({ where: { userId } }),
    prisma.highScore.findMany({ where: { userId } }),
  ]);

  const bestScores: Record<string, number> = {};
  for (const h of highScores) bestScores[h.gameId] = h.bestScore;

  const newIds = evaluateNewBadges({
    ownedBadgeIds: new Set(owned.map((b) => b.badgeId)),
    hasAnyReward: grantCount > 0,
    aura,
    gamesPlayed,
    bestScores,
    accountCreated: true,
  });

  if (newIds.length > 0) {
    await prisma.userBadge.createMany({
      data: newIds.map((badgeId) => ({ userId, badgeId })),
    });
    const { BADGE_REGISTRY } = await import('@aura/contracts');
    for (const id of newIds) {
      const def = BADGE_REGISTRY.find((b) => b.id === id);
      if (def) {
        await notify(userId, {
          type: 'BADGE',
          title: `Badge unlocked: ${def.name}`,
          body: def.description,
          data: { badgeId: id },
        });
      }
    }
  }

  const refreshed = await prisma.userBadge.findMany({ where: { userId } });
  return toBadgeViews(refreshed).filter((b) => newIds.includes(b.id));
}
