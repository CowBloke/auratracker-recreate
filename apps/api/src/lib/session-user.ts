import type { SessionUser } from '@aura/contracts';
import { type User, prisma } from '@aura/db';
import { toSessionUser } from './serialize';

export async function sessionUserPayload(user: User): Promise<SessionUser> {
  const balances = await prisma.balance.findMany({ where: { userId: user.id } });
  return toSessionUser(user, balances);
}
