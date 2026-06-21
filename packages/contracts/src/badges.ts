import type { BadgeRarity } from './enums';

/**
 * BADGE REGISTRY — single source of truth for the badge catalog.
 *
 * To add a badge: add an entry here. The seed inserts the catalog, and the
 * award engine (@aura/domain/badges) references these ids. `criteria` is a
 * machine-readable rule the auto-award checker understands.
 */
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide-react icon name
  rarity: BadgeRarity;
  /** Auto-award rule. 'manual' = admin-granted only. */
  criteria:
    | { kind: 'account_created' }
    | { kind: 'first_reward' }
    | { kind: 'score_at_least'; gameId: string; score: number }
    | { kind: 'aura_at_least'; amount: number }
    | { kind: 'games_played'; count: number }
    | { kind: 'manual' };
}

export const BADGE_REGISTRY = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Joined AuraTracker. Welcome aboard.',
    icon: 'Sparkles',
    rarity: 'common',
    criteria: { kind: 'account_created' },
  },
  {
    id: 'first_coin',
    name: 'First Coin',
    description: 'Earned your very first reward from a game.',
    icon: 'Coins',
    rarity: 'common',
    criteria: { kind: 'first_reward' },
  },
  {
    id: 'snake_charmer',
    name: 'Snake Charmer',
    description: 'Scored 25+ in Snake.',
    icon: 'Worm',
    rarity: 'rare',
    criteria: { kind: 'score_at_least', gameId: 'snake', score: 25 },
  },
  {
    id: 'tile_master',
    name: 'Tile Master',
    description: 'Scored 1000+ in 2048.',
    icon: 'Grid3x3',
    rarity: 'epic',
    criteria: { kind: 'score_at_least', gameId: '2048', score: 1000 },
  },
  {
    id: 'aura_magnate',
    name: 'Aura Magnate',
    description: 'Held 500+ aura at once.',
    icon: 'Gem',
    rarity: 'legendary',
    criteria: { kind: 'aura_at_least', amount: 500 },
  },
  {
    id: 'regular',
    name: 'Regular',
    description: 'Played 10 games.',
    icon: 'Flame',
    rarity: 'rare',
    criteria: { kind: 'games_played', count: 10 },
  },
] as const satisfies readonly BadgeDefinition[];

export type BadgeId = (typeof BADGE_REGISTRY)[number]['id'];
