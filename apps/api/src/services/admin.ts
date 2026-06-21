import { type AdminUserView, ECONOMY, type Role } from '@aura/contracts';
import { type User, prisma } from '@aura/db';
import { applyLedger } from '@aura/domain';
import { BadRequest, Conflict, Forbidden, NotFound } from '../lib/http-error';
import { balancesOf } from '../lib/serialize';
import { writeAudit } from './audit';
import { notify } from './notify';

async function adminView(userId: string): Promise<AdminUserView> {
  const u = await prisma.user.findUnique({ where: { id: userId }, include: { balances: true } });
  if (!u) throw new NotFound('User not found.');
  const balances = balancesOf(u.balances);
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    firstName: u.firstName,
    school: u.school,
    schoolLevel: u.schoolLevel,
    classLetter: u.classLetter,
    motivation: u.motivation,
    role: u.role as Role,
    status: u.status as AdminUserView['status'],
    money: balances.money,
    aura: balances.aura,
    createdAt: u.createdAt.toISOString(),
    approvedAt: u.approvedAt?.toISOString() ?? null,
  };
}

export async function listPending(): Promise<AdminUserView[]> {
  const users = await prisma.user.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });
  return Promise.all(users.map((u) => adminView(u.id)));
}

export async function listUsers(q?: string): Promise<AdminUserView[]> {
  const users = await prisma.user.findMany({
    where: q ? { usernameLower: { contains: q.toLowerCase() } } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return Promise.all(users.map((u) => adminView(u.id)));
}

export async function approveUser(admin: User, targetId: string, ip?: string): Promise<AdminUserView> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new NotFound('User not found.');
  if (target.status === 'ACTIVE') throw new Conflict('User is already active.');

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetId },
      data: { status: 'ACTIVE', approvedAt: new Date(), approvedById: admin.id },
    });
    // Starting balances, idempotent so re-approval never double-grants.
    await applyLedger(tx, {
      userId: targetId,
      currency: 'MONEY',
      amount: ECONOMY.STARTING_MONEY,
      reason: 'SEED',
      idempotencyKey: `welcome:${targetId}:money`,
    });
    await applyLedger(tx, {
      userId: targetId,
      currency: 'AURA',
      amount: ECONOMY.STARTING_AURA,
      reason: 'SEED',
      idempotencyKey: `welcome:${targetId}:aura`,
    });
    // Welcome badge.
    await tx.userBadge.upsert({
      where: { userId_badgeId: { userId: targetId, badgeId: 'first_steps' } },
      create: { userId: targetId, badgeId: 'first_steps', equipped: true },
      update: {},
    });
  });

  await writeAudit({
    actorId: admin.id,
    action: 'USER_APPROVE',
    targetType: 'user',
    targetId,
    summary: `Approved ${target.username}`,
    ip,
  });
  await notify(targetId, {
    type: 'ADMIN',
    title: 'Welcome to AuraTracker!',
    body: `Your account is approved. You start with ${ECONOMY.STARTING_MONEY} money and ${ECONOMY.STARTING_AURA} aura.`,
  });
  return adminView(targetId);
}

export async function rejectUser(admin: User, targetId: string, ip?: string): Promise<AdminUserView> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new NotFound('User not found.');
  await prisma.user.update({ where: { id: targetId }, data: { status: 'REJECTED' } });
  await writeAudit({
    actorId: admin.id,
    action: 'USER_REJECT',
    targetType: 'user',
    targetId,
    summary: `Rejected ${target.username}`,
    ip,
  });
  return adminView(targetId);
}

export async function banUser(
  admin: User,
  targetId: string,
  reason: string,
  ip?: string,
): Promise<AdminUserView> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new NotFound('User not found.');
  if (target.id === admin.id) throw new BadRequest('You cannot ban yourself.');

  await prisma.$transaction([
    prisma.user.update({ where: { id: targetId }, data: { status: 'BANNED', banReason: reason } }),
    prisma.session.updateMany({
      where: { userId: targetId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  await writeAudit({
    actorId: admin.id,
    action: 'USER_BAN',
    targetType: 'user',
    targetId,
    summary: `Banned ${target.username}: ${reason}`,
    ip,
  });
  return adminView(targetId);
}

export async function unbanUser(admin: User, targetId: string, ip?: string): Promise<AdminUserView> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new NotFound('User not found.');
  await prisma.user.update({ where: { id: targetId }, data: { status: 'ACTIVE', banReason: null } });
  await writeAudit({
    actorId: admin.id,
    action: 'USER_UNBAN',
    targetType: 'user',
    targetId,
    summary: `Unbanned ${target.username}`,
    ip,
  });
  return adminView(targetId);
}

export async function setRole(
  admin: User,
  targetId: string,
  role: Role,
  ip?: string,
): Promise<AdminUserView> {
  // Only super admins may grant elevated roles.
  if ((role === 'ADMIN' || role === 'SUPERADMIN') && admin.role !== 'SUPERADMIN') {
    throw new Forbidden('Only a super admin can grant admin roles.');
  }
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new NotFound('User not found.');
  await prisma.user.update({ where: { id: targetId }, data: { role } });
  await writeAudit({
    actorId: admin.id,
    action: 'ROLE_CHANGE',
    targetType: 'user',
    targetId,
    summary: `Changed ${target.username}'s role to ${role}`,
    metadata: { from: target.role, to: role },
    ip,
  });
  return adminView(targetId);
}

export async function grant(
  admin: User,
  targetId: string,
  currency: 'MONEY' | 'AURA',
  amount: number,
  note?: string,
  ip?: string,
) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new NotFound('User not found.');
  if (amount === 0) throw new BadRequest('Amount must be non-zero.');

  const balances = await prisma.$transaction(async (tx) => {
    await applyLedger(tx, {
      userId: targetId,
      currency,
      amount,
      reason: 'ADMIN_GRANT',
      refType: 'admin',
      refId: admin.id,
      metadata: { note },
      allowNegative: true, // admin corrections may push negative
    });
    return balancesOf(await tx.balance.findMany({ where: { userId: targetId } }));
  });

  await writeAudit({
    actorId: admin.id,
    action: currency === 'AURA' ? 'AURA_GRANT' : 'MONEY_GRANT',
    targetType: 'user',
    targetId,
    summary: `Granted ${amount} ${currency.toLowerCase()} to ${target.username}`,
    metadata: { amount, currency, note },
    ip,
  });
  await notify(targetId, {
    type: 'ADMIN',
    title: `An admin adjusted your ${currency.toLowerCase()} by ${amount > 0 ? '+' : ''}${amount}`,
    body: note,
  });
  return { balances };
}

export async function listAudit(limit: number) {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { actor: { select: { username: true } } },
  });
  return logs.map((l) => ({
    id: l.id,
    actorId: l.actorId,
    actorUsername: l.actor?.username ?? null,
    action: l.action,
    targetType: l.targetType,
    targetId: l.targetId,
    summary: l.summary,
    createdAt: l.createdAt.toISOString(),
  }));
}
