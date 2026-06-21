import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '../types';

const GRID = 9;
const DURATION = 20; // seconds

export function GameReflex({ onScore, onGameOver }: GameProps) {
  const [active, setActive] = useState(() => Math.floor(Math.random() * GRID));
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(DURATION);
  const scoreRef = useRef(0);
  const done = useRef(false);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const remaining = Math.max(0, DURATION - (Date.now() - start) / 1000);
      setTime(remaining);
      if (remaining <= 0 && !done.current) {
        done.current = true;
        clearInterval(id);
        setTimeout(() => onGameOver(scoreRef.current), 150);
      }
    }, 50);
    return () => clearInterval(id);
  }, [onGameOver]);

  const hit = useCallback(
    (i: number) => {
      if (done.current || i !== active) return;
      scoreRef.current += 1;
      setScore(scoreRef.current);
      onScore?.(scoreRef.current);
      let next = Math.floor(Math.random() * GRID);
      if (next === active) next = (next + 1) % GRID;
      setActive(next);
    },
    [active, onScore],
  );

  const pct = (time / DURATION) * 100;

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between text-sm text-muted">
        <span>
          Hits <span className="ml-1 font-display text-xl font-semibold text-cyan tabular-nums">{score}</span>
        </span>
        <span className="tabular-nums">{time.toFixed(1)}s</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-cyan transition-[width] duration-75" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid aspect-square w-full grid-cols-3 gap-2.5 rounded-2xl bg-black/30 p-2.5 ring-1 ring-line">
        {[...Array(GRID)].map((_, i) => (
          <button
            key={i}
            onClick={() => hit(i)}
            className="relative aspect-square rounded-xl bg-white/[0.03] transition active:scale-95"
          >
            <AnimatePresence>
              {i === active && (
                <motion.span
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  className="absolute inset-1.5 rounded-lg bg-gradient-to-br from-cyan to-aura shadow-[0_0_24px_-2px_var(--color-cyan)]"
                />
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>
      <p className="text-xs text-faint">Tap the glowing cell — fast!</p>
    </div>
  );
}
