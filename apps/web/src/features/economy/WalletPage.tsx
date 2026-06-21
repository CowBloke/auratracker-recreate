import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, Gift, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { api, unwrap } from '../../lib/api';
import { formatNumber, timeAgo } from '../../lib/format';
import { useAuth } from '../../stores/auth';
import { Page } from '../../components/shell/Page';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, Pill, Skeleton, StatTile } from '../../components/ui/primitives';
import { TransferModal } from './TransferModal';

export function WalletPage() {
  const user = useAuth((s) => s.user)!;
  const qc = useQueryClient();
  const [transferOpen, setTransferOpen] = useState(false);

  const history = useInfiniteQuery({
    queryKey: ['economy', 'history'],
    queryFn: async ({ pageParam }) =>
      unwrap(await api.economy.history({ query: { limit: 20, cursor: pageParam } })),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const entries = history.data?.pages.flatMap((p) => p.entries) ?? [];

  return (
    <Page
      title="Wallet"
      subtitle="Your balances and full transaction history."
      actions={
        <Button onClick={() => setTransferOpen(true)}>
          <Gift className="size-4" /> Gift aura
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile label="Money" value={formatNumber(user.balances.money)} icon="Coins" tone="amber" hint="Earned from games & gifts" />
        <StatTile label="Aura" value={formatNumber(user.balances.aura)} icon="Sparkles" tone="aura" hint="The social currency — gift it!" />
      </div>

      <Card className="p-6">
        <h3 className="mb-4 font-display font-semibold">Transaction history</h3>
        {history.isLoading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : entries.length > 0 ? (
          <>
            <ul className="divide-y divide-line-soft">
              {entries.map((e) => {
                const positive = e.amount >= 0;
                return (
                  <li key={e.id} className="flex items-center gap-3 py-3">
                    <span className={`grid size-9 place-items-center rounded-lg ${e.currency === 'AURA' ? 'bg-aura/10 text-aura' : 'bg-amber/10 text-amber'}`}>
                      {e.currency === 'AURA' ? <Sparkles className="size-4" /> : <Coins className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium capitalize">{e.reason.replace(/_/g, ' ').toLowerCase()}</p>
                      <p className="text-xs text-faint">
                        {timeAgo(e.createdAt)} · balance {formatNumber(e.balanceAfter)}
                      </p>
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
            {history.hasNextPage && (
              <div className="mt-4 text-center">
                <Button variant="subtle" loading={history.isFetchingNextPage} onClick={() => history.fetchNextPage()}>
                  Load more
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState icon="Receipt" title="No transactions yet" description="Play a game or receive a gift to get started." />
        )}
      </Card>

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ['economy'] });
        }}
      />
    </Page>
  );
}
