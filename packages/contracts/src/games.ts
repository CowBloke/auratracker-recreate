import type { GameCategory, GameStatus } from './enums';

/**
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │  GAME REGISTRY — SINGLE SOURCE OF TRUTH                                     │
 * │                                                                             │
 * │  To add a new game to AuraTracker, add ONE entry to GAME_REGISTRY below.    │
 * │  Everything else derives from it automatically:                             │
 * │    • the /games hub grid + category filters                                 │
 * │    • the play-route allow-list and reward eligibility                       │
 * │    • per-game reward computation (see @aura/domain/rewards)                 │
 * │    • leaderboards (one board per registered game)                           │
 * │                                                                             │
 * │  For a NATIVE game also register its React component in                     │
 * │  apps/web/src/features/games/registry.tsx (compile-time checked: the build │
 * │  fails if a live native game has no component).                             │
 * └───────────────────────────────────────────────────────────────────────────┘
 */

export interface GameRewardConfig {
  /** Money units granted per point of score (fractional allowed; floored). */
  moneyPerScore: number;
  /** Aura units granted per point of score. */
  auraPerScore: number;
  /** Hard cap on money from a single run, before daily caps. */
  maxMoneyPerRun: number;
  /** Hard cap on aura from a single run, before daily caps. */
  maxAuraPerRun: number;
  /** Minimum score that yields any reward (anti-noise floor). */
  minScore: number;
}

export interface GameDefinition {
  /** Stable id — used in URLs, scores, rewards, leaderboards. Never reuse. */
  id: string;
  name: string;
  tagline: string;
  category: GameCategory;
  /** 'native' = built-in React/canvas game; 'embedded' = external bundle (future). */
  kind: 'native' | 'embedded';
  status: GameStatus;
  /** Tailwind-friendly accent hex used across the card + play screen. */
  accent: string;
  /** lucide-react icon name. */
  icon: string;
  /** Short how-to shown on the play screen. */
  howTo: string;
  reward: GameRewardConfig;
}

export const GAME_REGISTRY = [
  {
    id: '2048',
    name: '2048',
    tagline: 'Slide tiles, chase the big numbers.',
    category: 'SINGLEPLAYER',
    kind: 'native',
    status: 'LIVE',
    accent: '#f59e0b',
    icon: 'Grid3x3',
    howTo: 'Use arrow keys or swipe to merge matching tiles. Reach 2048 — and beyond.',
    reward: { moneyPerScore: 0.05, auraPerScore: 0.01, maxMoneyPerRun: 120, maxAuraPerRun: 25, minScore: 64 },
  },
  {
    id: 'snake',
    name: 'Snake',
    tagline: 'Eat, grow, do not bite your tail.',
    category: 'SINGLEPLAYER',
    kind: 'native',
    status: 'LIVE',
    accent: '#22c55e',
    icon: 'Worm',
    howTo: 'Steer with arrow keys / WASD. Each apple grows you and scores points.',
    reward: { moneyPerScore: 1, auraPerScore: 0.2, maxMoneyPerRun: 90, maxAuraPerRun: 20, minScore: 3 },
  },
  {
    id: 'reflex',
    name: 'Reflex Grid',
    tagline: 'Tap the lit cells before time runs out.',
    category: 'SINGLEPLAYER',
    kind: 'native',
    status: 'NEW',
    accent: '#38bdf8',
    icon: 'Zap',
    howTo: 'Click the glowing cell as fast as you can. 20 seconds. Every hit scores.',
    reward: { moneyPerScore: 2, auraPerScore: 0.4, maxMoneyPerRun: 80, maxAuraPerRun: 18, minScore: 2 },
  },
  {
    id: 'tictactoe',
    name: 'Tic-Tac-Toe',
    tagline: 'Classic duels — live opponents soon.',
    category: 'MULTIPLAYER',
    kind: 'native',
    status: 'SOON',
    accent: '#c084fc',
    icon: 'Hash',
    howTo: 'Realtime head-to-head matches. Coming in the realtime phase.',
    reward: { moneyPerScore: 0, auraPerScore: 0, maxMoneyPerRun: 0, maxAuraPerRun: 0, minScore: 0 },
  },
] as const satisfies readonly GameDefinition[];

export type GameId = (typeof GAME_REGISTRY)[number]['id'];

const GAME_BY_ID = new Map<string, GameDefinition>(GAME_REGISTRY.map((g) => [g.id, g]));

export function getGame(id: string): GameDefinition | undefined {
  return GAME_BY_ID.get(id);
}

export function isPlayableGame(id: string): boolean {
  const g = GAME_BY_ID.get(id);
  return !!g && (g.status === 'LIVE' || g.status === 'BETA' || g.status === 'NEW');
}

export const PLAYABLE_GAMES = GAME_REGISTRY.filter((g) => g.status !== 'SOON');
