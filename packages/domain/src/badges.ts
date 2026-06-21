import { BADGE_REGISTRY, type BadgeDefinition } from '@aura/contracts';

export interface BadgeContext {
  ownedBadgeIds: Set<string>;
  hasAnyReward: boolean;
  aura: number;
  gamesPlayed: number;
  /** best score per gameId */
  bestScores: Record<string, number>;
  accountCreated: boolean;
}

function meetsCriteria(def: BadgeDefinition, ctx: BadgeContext): boolean {
  switch (def.criteria.kind) {
    case 'account_created':
      return ctx.accountCreated;
    case 'first_reward':
      return ctx.hasAnyReward;
    case 'aura_at_least':
      return ctx.aura >= def.criteria.amount;
    case 'games_played':
      return ctx.gamesPlayed >= def.criteria.count;
    case 'score_at_least':
      return (ctx.bestScores[def.criteria.gameId] ?? 0) >= def.criteria.score;
    case 'manual':
      return false;
  }
}

/** Returns the ids of badges newly earned (auto-award only, not already owned). */
export function evaluateNewBadges(ctx: BadgeContext): string[] {
  return BADGE_REGISTRY.filter(
    (def) => !ctx.ownedBadgeIds.has(def.id) && meetsCriteria(def, ctx),
  ).map((def) => def.id);
}
