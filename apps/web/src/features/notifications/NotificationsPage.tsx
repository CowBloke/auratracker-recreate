import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCheck } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { Page } from '../../components/shell/Page';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, Skeleton } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';

const ICONS: Record<string, string> = {
  REWARD: 'Coins',
  TRANSFER: 'Gift',
  BADGE: 'Award',
  ADMIN: 'ShieldCheck',
  SOCIAL: 'UserPlus',
  SYSTEM: 'Bell',
};
const TONE: Record<string, string> = {
  REWARD: 'bg-amber/10 text-amber',
  TRANSFER: 'bg-aura/10 text-aura',
  BADGE: 'bg-aura/10 text-aura',
  ADMIN: 'bg-rose/10 text-rose',
  SOCIAL: 'bg-cyan/10 text-cyan',
  SYSTEM: 'bg-white/5 text-muted',
};

export function NotificationsPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['notifications'], queryFn: async () => unwrap(await api.notifications.list()) });
  const markAll = useMutation({
    mutationFn: async () => unwrap(await api.notifications.markRead({ body: { all: true } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = list.data?.filter((n) => !n.read).length ?? 0;

  return (
    <Page
      title="Notifications"
      subtitle={unread > 0 ? `${unread} unread` : 'You’re all caught up.'}
      actions={
        unread > 0 ? (
          <Button variant="subtle" onClick={() => markAll.mutate()} loading={markAll.isPending}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        ) : undefined
      }
    >
      {list.isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : list.data && list.data.length > 0 ? (
        <div className="space-y-2">
          {list.data.map((n, i) => (
            <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
              <Card className={`flex items-start gap-3.5 p-4 ${n.read ? 'opacity-60' : ''}`}>
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${TONE[n.type] ?? TONE.SYSTEM}`}>
                  <Icon name={ICONS[n.type] ?? 'Bell'} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                  <p className="mt-1 text-xs text-faint">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-aura animate-pulse-glow" />}
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState icon="BellOff" title="No notifications" description="Rewards, gifts and badges will show up here." />
      )}
    </Page>
  );
}
