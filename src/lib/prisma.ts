import { PrismaClient } from '@prisma/client';

import { resolveDatabaseUrl } from '@/lib/database-url';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const database = resolveDatabaseUrl();

export const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    datasources: database.url
      ? {
          db: {
            url: database.url
          }
        }
      : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma;
}
