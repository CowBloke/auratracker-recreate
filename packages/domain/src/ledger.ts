import type { Currency, LedgerReason } from '@aura/contracts';
import type { DbTx } from '@aura/db';
import { InsufficientFundsError } from './errors';

export interface ApplyLedgerParams {
  userId: string;
  currency: Currency;
  /** Signed delta. Positive credits, negative debits. */
  amount: number;
  reason: LedgerReason;
  refType?: string;
  refId?: string;
  metadata?: Record<string, unknown>;
  /** When set, the same key applied twice is a no-op (returns the first result). */
  idempotencyKey?: string;
  /** Allow the balance to go below zero (e.g. admin corrections). Default false. */
  allowNegative?: boolean;
}

export interface ApplyLedgerResult {
  entryId: string;
  balanceAfter: number;
  idempotentReplay: boolean;
}

/**
 * The single primitive that moves money or aura. ALL balance changes go through
 * here so that:
 *   • the cached Balance row and the append-only LedgerEntry log never diverge
 *     (both are written in the same transaction), and
 *   • retries are safe — an idempotencyKey collision returns the original result
 *     instead of double-applying.
 *
 * Must be called inside `prisma.$transaction(async (tx) => …)`.
 */
export async function applyLedger(tx: DbTx, p: ApplyLedgerParams): Promise<ApplyLedgerResult> {
  if (p.idempotencyKey) {
    const existing = await tx.ledgerEntry.findUnique({ where: { idempotencyKey: p.idempotencyKey } });
    if (existing) {
      return { entryId: existing.id, balanceAfter: existing.balanceAfter, idempotentReplay: true };
    }
  }

  const balance = await tx.balance.upsert({
    where: { userId_currency: { userId: p.userId, currency: p.currency } },
    create: { userId: p.userId, currency: p.currency, amount: 0 },
    update: {},
  });

  const balanceAfter = balance.amount + p.amount;
  if (balanceAfter < 0 && !p.allowNegative) {
    throw new InsufficientFundsError(p.currency);
  }

  await tx.balance.update({
    where: { userId_currency: { userId: p.userId, currency: p.currency } },
    data: { amount: balanceAfter },
  });

  const entry = await tx.ledgerEntry.create({
    data: {
      userId: p.userId,
      currency: p.currency,
      amount: p.amount,
      balanceAfter,
      reason: p.reason,
      refType: p.refType,
      refId: p.refId,
      metadata: p.metadata ? JSON.stringify(p.metadata) : null,
      idempotencyKey: p.idempotencyKey,
    },
  });

  return { entryId: entry.id, balanceAfter, idempotentReplay: false };
}
