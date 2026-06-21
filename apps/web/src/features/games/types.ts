/** Contract every native game component implements. */
export interface GameProps {
  /** Report the live score as it changes (optional, for the HUD). */
  onScore?: (score: number) => void;
  /** Called once when the run ends, with the final score. */
  onGameOver: (score: number) => void;
}

export type GameComponent = (props: GameProps) => React.ReactNode;
