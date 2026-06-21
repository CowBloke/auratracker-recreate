import { GAME_REGISTRY, type GameId } from '@aura/contracts';
import { Game2048 } from './native/Game2048';
import { GameReflex } from './native/GameReflex';
import { GameSnake } from './native/GameSnake';
import type { GameComponent } from './types';

/**
 * Maps each NATIVE game id to its React component.
 *
 * Extensibility contract: when you add a native game to GAME_REGISTRY
 * (@aura/contracts/games), add its component here too. The type below makes the
 * build fail if a non-"SOON" native game is missing a component, so a game can
 * never appear in the hub without something to play.
 */
type LiveNativeId = Extract<
  (typeof GAME_REGISTRY)[number],
  { kind: 'native'; status: 'LIVE' | 'BETA' | 'NEW' }
>['id'];

const components: Record<LiveNativeId, GameComponent> = {
  '2048': Game2048,
  snake: GameSnake,
  reflex: GameReflex,
};

export function getGameComponent(id: GameId | string): GameComponent | null {
  return (components as Record<string, GameComponent>)[id] ?? null;
}
