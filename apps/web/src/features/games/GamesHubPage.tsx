import { GAME_REGISTRY, type GameCategory } from '@aura/contracts';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '../../lib/cn';
import { formatNumber } from '../../lib/format';
import { api, unwrap } from '../../lib/api';
import { Page } from '../../components/shell/Page';
import { Card, Pill } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';

type Tab = 'ALL' | GameCategory;
const TABS: { id: Tab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'SINGLEPLAYER', label: 'Single-player' },
  { id: 'MULTIPLAYER', label: 'Multiplayer' },
];

const STATUS_PILL: Record<string, { tone: 'emerald' | 'cyan' | 'amber' | 'muted'; label: string }> = {
  LIVE: { tone: 'emerald', label: 'Live' },
  NEW: { tone: 'cyan', label: 'New' },
  BETA: { tone: 'amber', label: 'Beta' },
  SOON: { tone: 'muted', label: 'Soon' },
};

export function GamesHubPage() {
  const [tab, setTab] = useState<Tab>('ALL');
  const state = useQuery({ queryKey: ['games', 'state'], queryFn: async () => unwrap(await api.games.state()) });

  const games = GAME_REGISTRY.filter((g) => tab === 'ALL' || g.category === tab);

  return (
    <Page title="Game hub" subtitle="Every game earns money and aura — within your daily caps.">
      <div className="flex gap-1.5 rounded-xl bg-white/[0.03] p-1 ring-1 ring-line-soft w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative rounded-lg px-4 py-1.5 text-sm font-medium transition',
              tab === t.id ? 'text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {tab === t.id && (
              <motion.span layoutId="games-tab" className="absolute inset-0 -z-10 rounded-lg bg-aura/20 ring-1 ring-aura/30" />
            )}
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g, i) => {
          const best = state.data?.highScores.find((h) => h.gameId === g.id)?.bestScore ?? 0;
          const playable = g.status !== 'SOON';
          const pill = STATUS_PILL[g.status]!;
          const inner = (
            <Card hover={playable} className={cn('group h-full p-5', !playable && 'opacity-70')}>
              <div
                className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
                style={{ background: g.accent }}
              />
              <div className="flex items-start justify-between">
                <span
                  className="grid size-12 place-items-center rounded-2xl ring-1 transition group-hover:scale-105"
                  style={{ background: `${g.accent}1f`, color: g.accent, borderColor: `${g.accent}45` }}
                >
                  <Icon name={g.icon} className="size-6" />
                </span>
                <Pill tone={pill.tone}>{pill.label}</Pill>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{g.name}</h3>
              <p className="mt-1 text-sm text-muted">{g.tagline}</p>
              <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3 text-xs">
                <span className="text-faint">
                  {g.category === 'MULTIPLAYER' ? 'Multiplayer' : 'Single-player'}
                </span>
                {playable && <span className="text-muted">Best: <span className="font-semibold text-ink tabular-nums">{formatNumber(best)}</span></span>}
              </div>
            </Card>
          );

          return (
            <motion.div key={g.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              {playable ? (
                <Link to="/games/$gameId" params={{ gameId: g.id }} className="block h-full">
                  {inner}
                </Link>
              ) : (
                <div className="h-full cursor-not-allowed">{inner}</div>
              )}
            </motion.div>
          );
        })}
      </div>
    </Page>
  );
}
