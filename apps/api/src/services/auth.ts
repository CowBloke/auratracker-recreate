import { randomUUID } from 'node:crypto';
import type { RegisterInput } from '@aura/contracts';
import { type User, prisma } from '@aura/db';
import { hashPassword, verifyPassword } from '../auth/passwords';
import { BadRequest, Conflict, Unauthorized } from '../lib/http-error';

function referralCode(): string {
  return randomUUID().slice(0, 8).toUpperCase();
}

export async function registerUser(input: RegisterInput): Promise<void> {
  const usernameLower = input.username.toLowerCase();
  const [byName, byEmail] = await Promise.all([
    prisma.user.findUnique({ where: { usernameLower } }),
    prisma.user.findUnique({ where: { email: input.email.toLowerCase() } }),
  ]);
  if (byName) throw new Conflict('That username is taken.', 'USERNAME_TAKEN');
  if (byEmail) throw new Conflict('That email is already registered.', 'EMAIL_TAKEN');

  let referredById: string | null = null;
  if (input.referralCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: input.referralCode } });
    referredById = referrer?.id ?? null;
  }

  await prisma.user.create({
    data: {
      username: input.username,
      usernameLower,
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      firstName: input.firstName,
      school: input.school,
      schoolLevel: input.schoolLevel,
      classLetter: input.classLetter,
      motivation: input.motivation,
      referralCode: referralCode(),
      referredById,
      status: 'PENDING',
      role: 'USER',
    },
  });
}

export async function authenticate(identifier: string, password: string): Promise<User> {
  const id = identifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ usernameLower: id }, { email: id }] },
  });
  // Always run a comparison to reduce username-enumeration timing differences.
  const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = await verifyPassword(password, hash);
  if (!user || !ok) throw new Unauthorized('Invalid credentials.');
  return user;
}

export async function changePassword(user: User, current: string, next: string): Promise<void> {
  const ok = await verifyPassword(current, user.passwordHash);
  if (!ok) throw new BadRequest('Current password is incorrect.');
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  // Revoke all other sessions on password change.
  await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
