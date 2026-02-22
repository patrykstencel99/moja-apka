import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

import { prisma } from '@/lib/prisma';
import { hashSessionToken, SESSION_COOKIE } from '@/lib/session';

export async function requireApiUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const session = await prisma.session.findFirst({
    where: {
      tokenHash: hashSessionToken(token),
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: true
    }
  });

  if (!session) {
    throw new Error('UNAUTHORIZED');
  }

  if (!session.user.email || !session.user.passwordHash) {
    throw new Error('UNAUTHORIZED');
  }

  return session.user;
}

export async function getServerUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const session = await prisma.session.findFirst({
    where: {
      tokenHash: hashSessionToken(token),
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: true
    }
  });

  if (!session) {
    throw new Error('UNAUTHORIZED');
  }

  if (!session.user.email || !session.user.passwordHash) {
    throw new Error('UNAUTHORIZED');
  }

  return session.user;
}
