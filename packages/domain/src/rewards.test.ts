import { describe, expect, it } from 'vitest';
import { GAME_REGISTRY, getGame } from '@aura/contracts';
import { computeRunReward } from './rewards';
import { evaluateNewBadges } from './badges';
import { dayKey } from './time';

const snake = getGame('snake')!;

describe('computeRunReward', () => {
  const plenty = { money: 9999, aura: 9999 };

  it('grants nothing below the minimum score', () => {
    expect(computeRunReward(snake.reward, 2, plenty)).toEqual({
      money: 0,
      aura: 0,
      cappedByDaily: false,
    });
  });

  it('scales linearly then clamps at the per-run cap', () => {
    const r = computeRunReward(snake.reward, 1000, plenty);
    expect(r.money).toBe(snake.reward.maxMoneyPerRun);
    expect(r.aura).toBe(snake.reward.maxAuraPerRun);
  });

  it('floors fractional rewards', () => {
    const cfg = { ...snake.reward, moneyPerScore: 0.3, maxMoneyPerRun: 999, minScore: 0 };
    expect(computeRunReward(cfg, 7, plenty).money).toBe(2); // floor(2.1)
  });

  it('never exceeds the remaining daily allowance', () => {
    const r = computeRunReward(snake.reward, 1000, { money: 5, aura: 1 });
    expect(r.money).toBe(5);
    expect(r.aura).toBe(1);
    expect(r.cappedByDaily).toBe(true);
  });

  it('never returns a negative reward', () => {
    const r = computeRunReward(snake.reward, 1000, { money: -10, aura: 0 });
    expect(r.money).toBe(0);
    expect(r.aura).toBe(0);
  });
});

describe('evaluateNewBadges', () => {
  const base = {
    ownedBadgeIds: new Set<string>(),
    hasAnyReward: false,
    aura: 0,
    gamesPlayed: 0,
    bestScores: {},
    accountCreated: true,
  };

  it('awards account + reward badges and respects ownership', () => {
    const ids = evaluateNewBadges({ ...base, hasAnyReward: true });
    expect(ids).toContain('first_steps');
    expect(ids).toContain('first_coin');
  });

  it('does not re-award owned badges', () => {
    const ids = evaluateNewBadges({
      ...base,
      ownedBadgeIds: new Set(['first_steps']),
    });
    expect(ids).not.toContain('first_steps');
  });

  it('awards a score badge when the threshold is met', () => {
    const ids = evaluateNewBadges({ ...base, bestScores: { snake: 30 } });
    expect(ids).toContain('snake_charmer');
  });
});

describe('dayKey', () => {
  it('produces a YYYY-MM-DD key', () => {
    expect(dayKey(new Date('2026-06-18T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('rolls over at Paris midnight, not UTC midnight', () => {
    // 2026-06-17 23:30 UTC is already 2026-06-18 in Paris (UTC+2 in summer).
    expect(dayKey(new Date('2026-06-17T23:30:00Z'))).toBe('2026-06-18');
  });
});

describe('game registry integrity', () => {
  it('has unique ids', () => {
    const ids = GAME_REGISTRY.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
