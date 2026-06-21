import { ECONOMY } from '@aura/contracts';
import { prisma } from '@aura/db';
import { DailyCapError, DomainError, applyLedger, dayKey } from '@aura/domain';
import { BadRequest, NotFound } from '../lib/http-error';
import { balancesOf } from '../lib/serialize';
import { notify } from './notify';

export async function getBalances(userId: string) {
  const rows = await prisma.balance.findMany({ where: { userId } });
  return balancesOf(rows);
}

export async function transferAura(
  fromUser: { id: string; username: string },
  toUserId: string,
  amount: number,
  message?: string,
) {
  if (amount < ECONOMY.AURA_TRANSFER_MIN) throw new BadRequest('Amount too small.');
  if (toUserId === fromUser.id) throw new BadRequest('You cannot send aura to yourself.');

  const recipient = await prisma.user.findUnique({ where: { id: toUserId } });
  if (!recipient || recipient.status !== 'ACTIVE') throw new NotFound('Recipient not found.');

  const today = dayKey();

  const result = await prisma.$transaction(async (tx) => {
    const sentAgg = await tx.auraTransfer.aggregate({
      where: { fromUserId: fromUser.id, dayKey: today },
      _sum: { amount: true },
    });
    const sentToday = sentAgg._sum.amount ?? 0;
    if (sentToday + amount > ECONOMY.AURA_TRANSFER_DAILY_CAP) {
      throw new DailyCapError(
        `Daily gifting limit is ${ECONOMY.AURA_TRANSFER_DAILY_CAP} aura. You have ${
          ECONOMY.AURA_TRANSFER_DAILY_CAP - sentToday
        } left today.`,
      );
    }

    const transfer = await tx.auraTransfer.create({
      data: { fromUserId: fromUser.id, toUserId, amount, message, dayKey: today },
    });

    await applyLedger(tx, {
      userId: fromUser.id,
      currency: 'AURA',
      amount: -amount,
      reason: 'TRANSFER_OUT',
      refType: 'transfer',
      refId: transfer.id,
      idempotencyKey: `transfer:${transfer.id}:out`,
    });
    await applyLedger(tx, {
      userId: toUserId,
      currency: 'AURA',
      amount,
      reason: 'TRANSFER_IN',
      refType: 'transfer',
      refId: transfer.id,
      idempotencyKey: `transfer:${transfer.id}:in`,
    });

    const balances = balancesOf(await tx.balance.findMany({ where: { userId: fromUser.id } }));
    return { transferId: transfer.id, balances, sentToday: sentToday + amount };
  });

  await notify(toUserId, {
    type: 'TRANSFER',
    title: `${fromUser.username} sent you ${amount} aura`,
    body: message || undefined,
    data: { fromUserId: fromUser.id, amount },
  });

  return {
    transferId: result.transferId,
    balances: result.balances,
    remainingDailyAllowance: ECONOMY.AURA_TRANSFER_DAILY_CAP - result.sentToday,
  };
}

export { DomainError };
