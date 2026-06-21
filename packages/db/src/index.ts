import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

/**
 * Single PrismaClient per process. In dev, hot-reload can re-evaluate modules
 * repeatedly; caching on globalThis avoids exhausting the connection pool.
 */
const globalForPrisma = globalThis as unknown as { __auraPrisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.__auraPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.__auraPrisma = prisma;

export type DbClient = PrismaClient;
/** A transaction handle — the type passed to `prisma.$transaction(async (tx) => …)`. */
export type DbTx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
