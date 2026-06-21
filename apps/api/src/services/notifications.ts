import { prisma } from '@aura/db';
import { toNotificationView } from '../lib/serialize';

export async function listNotifications(userId: string) {
  const rows = await prisma.notification.findMany({
    where: { userId, archivedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return rows.map(toNotificationView);
}

export function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null, archivedAt: null } });
}

export async function markRead(userId: string, opts: { ids?: string[]; all?: boolean }) {
  if (opts.all) {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  } else if (opts.ids?.length) {
    await prisma.notification.updateMany({
      where: { userId, id: { in: opts.ids } },
      data: { readAt: new Date() },
    });
  }
}
