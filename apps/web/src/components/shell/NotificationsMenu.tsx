import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, unwrap } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { EmptyState } from '../ui/primitives';
import { Icon } from '../ui/Icon';

const ICONS: Record<string, string> = {
  REWARD: 'Coins',
  TRANSFER: 'Gift',
  BADGE: 'Award',
  ADMIN: 'ShieldCheck',
  SOCIAL: 'UserPlus',
  SYSTEM: 'Bell',
};

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => unwrap(await api.notifications.list()),
    refetchInterval: 60_000,
  });
  const unread = list.data?.filter((n) => !n.read).length ?? 0;

  const markRead = useMutation({
    mutationFn: async () => unwrap(await api.notifications.markRead({ body: { all: true } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-10 place-items-center rounded-xl text-muted transition hover:bg-white/5 hover:text-ink"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-rose px-1 text-[10px] font-bold text-white ring-2 ring-base"
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="card absolute right-0 top-12 z-50 w-[min(90vw,360px)] overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-display text-sm font-semibold">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={() => markRead.mutate()}
                  className="inline-flex items-center gap-1 text-xs text-aura hover:underline"
                >
                  <CheckCheck className="size-3.5" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {list.data && list.data.length === 0 ? (
                <div className="p-4">
                  <EmptyState icon="BellOff" title="All caught up" description="No notifications yet." />
                </div>
              ) : (
                list.data?.map((n) => (
                  <div
                    key={n.id}
                    className={`flex gap-3 border-b border-line-soft px-4 py-3 transition hover:bg-white/[0.03] ${
                      n.read ? 'opacity-60' : ''
                    }`}
                  >
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-aura/10 text-aura">
                      <Icon name={ICONS[n.type] ?? 'Bell'} className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-muted">{n.body}</p>}
                      <p className="mt-1 text-[11px] text-faint">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-aura" />}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
