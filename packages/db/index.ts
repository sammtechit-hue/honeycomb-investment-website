import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

// Reuse a single PrismaClient across hot-reloads in dev (Next.js/ts-node
// re-execute this module on every reload, which would otherwise open a
// fresh pool of DB connections each time).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
