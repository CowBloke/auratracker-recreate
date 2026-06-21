import type { AuditAction } from '@aura/contracts';
import { prisma } from '@aura/db';

export interface AuditInput {
  actorId: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}

/** Append an immutable admin/governance audit record. */
export function writeAudit(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      summary: input.summary,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      ip: input.ip,
    },
  });
}
