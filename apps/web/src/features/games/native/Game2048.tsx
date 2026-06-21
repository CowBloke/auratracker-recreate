import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '../types';

type Board = number[];
const SIZE = 4;

function emptyCells(b: Board): number[] {
  const out: number[] = [];
  b.forEach((v, i) => v === 0 && out.push(i));
  return out;
}
function spawn(b: Board): Board {
  const cells = emptyCells(b);
  if (cells.length === 0) return b;
  const idx = cells[Math.floor(Math.random() * cells.length)]!;
  const next = [...b];
  next[idx] = Math.random() < 0.9 ? 2 : 4;
  return next;
}
function newBoard(): Board {
  return spawn(spawn(Array(SIZE * SIZE).fill(0)));
}
function rotate(b: Board): Board {
  const n: Board = Array(SIZE * SIZE).fill(0);
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) n[c * SIZE + (SIZE - 1 - r)] = b[r * SIZE + c]!;
  return n;
}
function rotateN(b: Board, times: number): Board {
  let out = b;
  for (let i = 0; i < times; i++) out = rotate(out);
  return out;
}
/** Slide+merge to the left. Returns new board, gained score, and whether anything moved. */
function slideLeft(b: Board): { board: Board; gained: number; moved: boolean } {
  let gained = 0;
  let moved = false;
  const out: Board = [];
  for (let r = 0; r < SIZE; r++) {
    const row = b.slice(r * SIZE, r * SIZE + SIZE).filter((v) => v !== 0);
    const merged: number[] = [];
    for (let i = 0; i < row.length; i++) {
      if (row[i] === row[i + 1]) {
        const val = row[i]! * 2;
        merged.push(val);
        gained += val;
        i++;
      } else merged.push(row[i]!);
    }
    while (merged.length < SIZE) merged.push(0);
    for (let c = 0; c < SIZE; c++) {
      if (merged[c] !== b[r * SIZE + c]) moved = true;
      out[r * SIZE + c] = merged[c]!;
    }
  }
  return { board: out, gained, moved };
}
function move(b: Board, dir: 0 | 1 | 2 | 3): { board: Board; gained: number; moved: boolean } {
  // 0 left, 1 up, 2 right, 3 down — rotate so it's always a left-slide.
  const pre = rotateN(b, dir);
  const { board, gained, moved } = slideLeft(pre);
  return { board: rotateN(board, (4 - dir) % 4), gained, moved };
}
function canMove(b: Board): boolean {
  if (emptyCells(b).length > 0) return true;
  return [0, 1, 2, 3].some((d) => move(b, d as 0).moved);
}

const TILE_STYLES: Record<number, string> = {
  2: 'bg-white/10 text-ink',
  4: 'bg-white/15 text-ink',
  8: 'bg-amber/30 text-amber',
  16: 'bg-amber/40 text-amber',
  32: 'bg-orange-500/40 text-orange-200',
  64: 'bg-orange-500/60 text-white',
  128: 'bg-aura/40 text-aura',
  256: 'bg-aura/55 text-white',
  512: 'bg-aura/70 text-white',
  1024: 'bg-cyan/60 text-white',
  2048: 'bg-emerald/70 text-white ring-2 ring-emerald',
};

export function Game2048({ onScore, onGameOver }: GameProps) {
  const [board, setBoard] = useState<Board>(newBoard);
  const [score, setScore] = useState(0);
  const over = useRef(false);

  const doMove = useCallback(
    (dir: 0 | 1 | 2 | 3) => {
      if (over.current) return;
      setBoard((b) => {
        const res = move(b, dir);
        if (!res.moved) return b;
        const next = spawn(res.board);
        setScore((s) => {
          const ns = s + res.gained;
          onScore?.(ns);
          return ns;
        });
        if (!canMove(next)) {
          over.current = true;
          setScore((s) => {
            setTimeout(() => onGameOver(s), 350);
            return s;
          });
        }
        return next;
      });
    },
    [onGameOver, onScore],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, 0 | 1 | 2 | 3> = {
        ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3,
        a: 0, w: 1, d: 2, s: 3,
      };
      const dir = map[e.key];
      if (dir !== undefined) {
        e.preventDefault();
        doMove(dir);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doMove]);

  // Touch swipe
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0]!.clientX - touch.current.x;
    const dy = e.changedTouches[0]!.clientY - touch.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 2 : 0);
    else doMove(dy > 0 ? 3 : 1);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-muted">
        Score <span className="ml-1 font-display text-xl font-semibold text-ink tabular-nums">{score}</span>
      </div>
      <div
        className="grid aspect-square w-full max-w-sm grid-cols-4 gap-2.5 rounded-2xl bg-black/30 p-2.5 ring-1 ring-line"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {board.map((v, i) => (
          <div key={i} className="relative aspect-square rounded-xl bg-white/[0.03]">
            {v !== 0 && (
              <motion.div
                key={`${i}-${v}`}
                initial={{ scale: 0.7, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                className={`absolute inset-0 grid place-items-center rounded-xl font-display font-bold tabular-nums ${TILE_STYLES[v] ?? 'bg-emerald/70 text-white'} ${v >= 1000 ? 'text-lg' : 'text-2xl'}`}
              >
                {v}
              </motion.div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-faint">Arrow keys / WASD · or swipe</p>
    </div>
  );
}
