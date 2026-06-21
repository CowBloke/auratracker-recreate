import { PLAYABLE_GAMES } from '@aura/contracts';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { ArrowRight, Coins, Sparkles, TrendingUp } from 'lucide-react';
import { api, rpc, unwrap } from '../../lib/api';
import { formatNumber, timeAgo } from '../../lib/format';
import { Page } from '../../components/shell/Page';
import { Card, EmptyState, Skeleton, StatTile } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { Pill } from '../../components/ui/primitives';
import { useAuth } from '../../stores/auth';

function CapBar({ label, value, cap, tone }: { label: string; value: number; cap: number; tone: string }) {
  const pct = Math.min(100, Math.round((value / cap) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums text-faint">
          {formatNumber(value)} / {formatNumber(cap)}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: tone }}
        />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const user = useAuth((s) => s.user)!;
  const state = useQuery({ queryKey: ['games', 'state'], queryFn: async () => unwrap(await api.games.state()) });
  const history = useQuery({
    queryKey: ['economy', 'history', 'recent'],
    queryFn: async () => unwrap(await api.economy.history({ query: { limit: 6 } })),
  });
  const overall = useQuery({
    queryKey: ['leaderboards', 'overall'],
    queryFn: async () => unwrap(await rpc(api.leaderboards.get, { params: { board: 'overall' } })),
  });

  const featured = PLAYABLE_GAMES.slice(0, 3);

  return (
    <Page
      title={`Hey ${user.firstName} 👋`}
      subtitle="Here's your aura at a glance. Ready for a run?"
      actions={
        <Link to="/games">
          <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-aura to-aura-deep px-5 py-2.5 text-sm font-medium text-white ring-1 ring-white/10 transition hover:brightness-110">
            Play now <ArrowRight className="size-4" />
          </span>
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="Money" value={formatNumber(user.balances.money)} icon="Coins" tone="amber" />
        <StatTile label="Aura" value={formatNumber(user.balances.aura)} icon="Sparkles" tone="aura" />
        <StatTile
          label="Overall rank"
          value={overall.data?.me ? `#${overall.data.me.rank}` : '—'}
          icon="Trophy"
          tone="cyan"
          hint={overall.data ? `of ${overall.data.entries.length} players` : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily rewards */}
        <Card className="p-6 lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="size-5 text-emerald" />
            <h3 className="font-display font-semibold">Today's earnings</h3>
          </div>
          {state.data ? (
            <div className="space-y-4">
              <CapBar label="Money earned" value={state.data.daily.moneyToday} cap={state.data.daily.moneyCap} tone="var(--color-amber)" />
              <CapBar label="Aura earned" value={state.data.daily.auraToday} cap={state.data.daily.auraCap} tone="var(--color-aura)" />
              <p className="text-xs text-faint">Daily caps reset at midnight (Europe/Paris).</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          )}
        </Card>

        {/* Jump back in */}
        <div className="lg:col-span-2">
          <h3 className="mb-4 font-display font-semibold">Jump back in</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {featured.map((g, i) => {
              const best = state.data?.highScores.find((h) => h.gameId === g.id)?.bestScore ?? 0;
              return (
                <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Link to="/games/$gameId" params={{ gameId: g.id }}>
                    <Card hover className="group p-5">
                      <span
                        className="grid size-11 place-items-center rounded-xl ring-1"
                        style={{ background: `${g.accent}1a`, color: g.accent, borderColor: `${g.accent}40` }}
                      >
                        <Icon name={g.icon} className="size-6" />
                      </span>
                      <p className="mt-3 font-display font-semibold">{g.name}</p>
                      <p className="mt-0.5 text-xs text-muted">Best: {formatNumber(best)}</p>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <Card className="p-6">
        <h3 className="mb-4 font-display font-semibold">Recent activity</h3>
        {history.isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : history.data && history.data.entries.length > 0 ? (
          <ul className="divide-y divide-line-soft">
            {history.data.entries.map((e) => {
              const positive = e.amount >= 0;
              return (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <span className={`grid size-9 place-items-center rounded-lg ${e.currency === 'AURA' ? 'bg-aura/10 text-aura' : 'bg-amber/10 text-amber'}`}>
                    {e.currency === 'AURA' ? <Sparkles className="size-4" /> : <Coins className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium capitalize">{e.reason.replace(/_/g, ' ').toLowerCase()}</p>
                    <p className="text-xs text-faint">{timeAgo(e.createdAt)}</p>
                  </div>
                  <span className={`font-semibold tabular-nums ${positive ? 'text-emerald' : 'text-rose'}`}>
                    {positive ? '+' : ''}
                    {formatNumber(e.amount)}
                  </span>
                  <Pill tone={e.currency === 'AURA' ? 'aura' : 'amber'}>{e.currency === 'AURA' ? 'aura' : 'money'}</Pill>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon="Sparkles" title="No activity yet" description="Play a game to start earning." />
        )}
      </Card>
    </Page>
  );
}
