import type { GameRewardConfig } from '@aura/contracts';

export interface RewardResult {
  money: number;
  aura: number;
  /** True when the per-run reward was reduced by the remaining daily allowance. */
  cappedByDaily: boolean;
}

/**
 * Pure reward computation for a single finished run. Deterministic and fully
 * unit-tested — the economy's correctness hinges on this.
 *
 * Order of clamping: score floor → per-run cap → remaining daily allowance.
 */
export function computeRunReward(
  config: GameRewardConfig,
  score: number,
  remaining: { money: number; aura: number },
): RewardResult {
  if (score < config.minScore) {
    return { money: 0, aura: 0, cappedByDaily: false };
  }

  const rawMoney = Math.min(Math.floor(score * config.moneyPerScore), config.maxMoneyPerRun);
  const rawAura = Math.min(Math.floor(score * config.auraPerScore), config.maxAuraPerRun);

  const money = Math.max(0, Math.min(rawMoney, remaining.money));
  const aura = Math.max(0, Math.min(rawAura, remaining.aura));

  return { money, aura, cappedByDaily: money < rawMoney || aura < rawAura };
}
