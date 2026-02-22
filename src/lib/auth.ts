import { NextRequest } from 'next/server';

import { ensureBootstrapUser } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';

// Auth is disabled for this single-user MVP.
export async function requireApiUser(_request: NextRequest) {
  void _request;
  return ensureBootstrapUser(prisma);
}

export async function getServerUser() {
  return ensureBootstrapUser(prisma);
}
