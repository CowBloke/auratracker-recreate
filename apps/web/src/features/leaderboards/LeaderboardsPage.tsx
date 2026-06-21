import { PLAYABLE_GAMES, type LeaderboardView } from '@aura/contracts';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '../../lib/cn';
import { formatNumber } from '../../lib/format';
import { api, rpc, unwrap } from '../../lib/api';
import { Page } from '../../components/shell/Page';
import { Avatar } from '../../components/ui/Avatar';
import { Card, EmptyState, Skeleton } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';

type BoardKey = { kind: 'core'; id: 'overall' | 'money' | 'aura' } | { kind: 'game'; id: string };

const CORE: { id: 'overall' | 'money' | 'aura'; label: string; icon: string }[] = [
  { id: 'overall', label: 'Overall', icon: 'Crown' },
  { id: 'money', label: 'Money', icon: 'Coins' },
  { id: 'aura', label: 'Aura', icon: 'Sparkles' },
];

export function LeaderboardsPage() {
  const [board, setBoard] = useState<BoardKey>({ kind: 'core', id: 'overall' });

  const q = useQuery<LeaderboardView>({
    queryKey: ['leaderboards', board.kind, board.id],
    queryFn: async () =>
      board.kind === 'core'
        ? unwrap(await rpc(api.leaderboards.get, { params: { board: board.id } }))
        : unwrap(await rpc(api.games.leaderboard, { params: { id: board.id } })),
  });

  const isActive = (b: BoardKey) => b.kind === board.kind && b.id === board.id;
  const unit = board.kind === 'core' ? board.id : 'pts';

  return (
    <Page title="Leaderboards" subtitle="Where do you stand?">
      <div className="flex flex-wrap gap-2">
        {CORE.map((c) => (
          <Chip key={c.id} active={isActive({ kind: 'core', id: c.id })} icon={c.icon} onClick={() => setBoard({ kind: 'core', id: c.id })}>
            {c.label}
          </Chip>
        ))}
        <span className="mx-1 self-center text-line">·</span>
        {PLAYABLE_GAMES.map((g) => (
          <Chip key={g.id} active={isActive({ kind: 'game', id: g.id })} icon={g.icon} onClick={() => setBoard({ kind: 'game', id: g.id })}>
            {g.name}
          </Chip>
        ))}
      </div>

      {q.isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : q.data && q.data.entries.length > 0 ? (
        <Card className="overflow-hidden">
          <ul>
            {q.data.entries.map((e, i) => (
              <motion.li
                key={e.userId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.4) }}
                className={cn(
                  'flex items-center gap-3 border-b border-line-soft px-4 py-3 last:border-0',
                  e.isMe && 'bg-aura/[0.07]',
                )}
              >
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold tabular-nums',
                    e.rank === 1 && 'bg-amber/20 text-amber',
                    e.rank === 2 && 'bg-white/10 text-ink',
                    e.rank === 3 && 'bg-orange-500/20 text-orange-300',
                    e.rank > 3 && 'text-faint',
                  )}
                >
                  {e.rank}
                </span>
                <Avatar username={e.username} color={e.usernameColor} src={e.avatarUrl} size="sm" />
                <span className="flex-1 truncate font-medium" style={{ color: e.usernameColor }}>
                  {e.username} {e.isMe && <span className="text-xs text-faint">(you)</span>}
                </span>
                <span className="font-display font-semibold tabular-nums">{formatNumber(e.value)}</span>
                <span className="w-12 text-right text-xs text-faint">{unit}</span>
              </motion.li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState icon="Trophy" title="No rankings yet" description="Be the first to make the board." />
      )}
    </Page>
  );
}

function Chip({ active, icon, children, onClick }: { active: boolean; icon: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
        active ? 'border-aura/50 bg-aura/15 text-ink' : 'border-line text-muted hover:border-aura/40 hover:text-ink',
      )}
    >
      <Icon name={icon} className="size-4" />
      {children}
    </button>
  );
}
