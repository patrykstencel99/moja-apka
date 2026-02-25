import { Prisma } from '@prisma/client';

import { apiCopy } from '@/lib/copy';

const CONNECTION_ERROR_CODES = new Set(['P1000', 'P1001', 'P1002', 'P1017']);

export function isDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return CONNECTION_ERROR_CODES.has(error.code);
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("can't reach database server") ||
      message.includes('database server') ||
      message.includes('connection') ||
      message.includes('connect')
    );
  }

  return false;
}

export function databaseSetupMessage() {
  return apiCopy.runtime.dbUnreachableMessage;
}
