import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../types';

const GRID = 18;
const CELL = 20;
const SIZE = GRID * CELL;
const TICK_MS = 120;

type Pt = { x: number; y: number };

export function GameSnake({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);

  const snake = useRef<Pt[]>([{ x: 9, y: 9 }]);
  const dir = useRef<Pt>({ x: 1, y: 0 });
  const nextDir = useRef<Pt>({ x: 1, y: 0 });
  const apple = useRef<Pt>({ x: 4, y: 4 });
  const running = useRef(true);
  const scoreRef = useRef(0);

  useEffect(() => {
    function placeApple() {
      let p: Pt;
      do {
        p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
      } while (snake.current.some((s) => s.x === p.x && s.y === p.y));
      apple.current = p;
    }
    placeApple();

    const ctx = canvasRef.current?.getContext('2d');

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, SIZE, SIZE);
      // subtle grid backdrop
      ctx.fillStyle = 'rgba(255,255,255,0.015)';
      for (let i = 0; i < GRID; i++)
        for (let j = 0; j < GRID; j++)
          if ((i + j) % 2 === 0) ctx.fillRect(i * CELL, j * CELL, CELL, CELL);

      // apple
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(apple.current.x * CELL + CELL / 2, apple.current.y * CELL + CELL / 2, CELL / 2.6, 0, Math.PI * 2);
      ctx.fill();

      // snake
      snake.current.forEach((s, i) => {
        const t = i / Math.max(1, snake.current.length);
        ctx.fillStyle = i === 0 ? '#34d399' : `rgba(52, 211, 153, ${0.9 - t * 0.5})`;
        const pad = 2;
        const r = 6;
        const x = s.x * CELL + pad;
        const y = s.y * CELL + pad;
        const w = CELL - pad * 2;
        ctx.beginPath();
        ctx.roundRect(x, y, w, w, r);
        ctx.fill();
      });
    }

    function step() {
      if (!running.current) return;
      dir.current = nextDir.current;
      const head = snake.current[0]!;
      const nh: Pt = { x: head.x + dir.current.x, y: head.y + dir.current.y };

      const hitWall = nh.x < 0 || nh.y < 0 || nh.x >= GRID || nh.y >= GRID;
      const hitSelf = snake.current.some((s) => s.x === nh.x && s.y === nh.y);
      if (hitWall || hitSelf) {
        running.current = false;
        setTimeout(() => onGameOver(scoreRef.current), 200);
        return;
      }

      const ate = nh.x === apple.current.x && nh.y === apple.current.y;
      const next = [nh, ...snake.current];
      if (!ate) next.pop();
      else {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        onScore?.(scoreRef.current);
        placeApple();
      }
      snake.current = next;
      draw();
    }

    draw();
    const id = setInterval(step, TICK_MS);

    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      const d = dir.current;
      if ((k === 'ArrowUp' || k === 'w') && d.y === 0) nextDir.current = { x: 0, y: -1 };
      else if ((k === 'ArrowDown' || k === 's') && d.y === 0) nextDir.current = { x: 0, y: 1 };
      else if ((k === 'ArrowLeft' || k === 'a') && d.x === 0) nextDir.current = { x: -1, y: 0 };
      else if ((k === 'ArrowRight' || k === 'd') && d.x === 0) nextDir.current = { x: 1, y: 0 };
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(id);
      window.removeEventListener('keydown', onKey);
      running.current = false;
    };
  }, [onGameOver, onScore]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-muted">
        Length <span className="ml-1 font-display text-xl font-semibold text-emerald tabular-nums">{score}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="w-full max-w-sm rounded-2xl bg-black/30 ring-1 ring-line"
        style={{ aspectRatio: '1 / 1' }}
      />
      <p className="text-xs text-faint">Arrow keys / WASD</p>
    </div>
  );
}
