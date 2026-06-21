import type { NotificationView } from '@aura/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { connectSocket, disconnectSocket } from '../../lib/socket';
import { useUi } from '../../stores/ui';

const NOTIF_ICON: Record<string, string> = {
  REWARD: 'Coins',
  TRANSFER: 'Gift',
  BADGE: 'Award',
  ADMIN: 'ShieldCheck',
  SOCIAL: 'UserPlus',
  SYSTEM: 'Bell',
};

/** Wires the realtime socket into presence + live notifications/toasts. */
export function useRealtime(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const socket = connectSocket();

    const onPresence = (p: { online: number }) => useUi.getState().setOnline(p.online);
    const onNotification = (n: NotificationView) => {
      useUi.getState().pushToast({
        title: n.title,
        description: n.body ?? undefined,
        variant: n.type === 'BADGE' ? 'aura' : n.type === 'REWARD' ? 'success' : 'default',
        icon: NOTIF_ICON[n.type] ?? 'Bell',
      });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('presence', onPresence);
    socket.on('notification', onNotification);
    return () => {
      socket.off('presence', onPresence);
      socket.off('notification', onNotification);
      disconnectSocket();
    };
  }, [enabled, qc]);
}
