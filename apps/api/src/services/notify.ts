import type { NotificationType } from '@aura/contracts';
import { prisma } from '@aura/db';
import { emitToUser } from '../realtime/emitter';
import { toNotificationView } from '../lib/serialize';

export interface NotifyInput {
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

/** Persist a notification and push it live to the user's sockets. */
export async function notify(userId: string, input: NotifyInput) {
  const n = await prisma.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ? JSON.stringify(input.data) : null,
    },
  });
  emitToUser(userId, 'notification', toNotificationView(n));
  return n;
}
