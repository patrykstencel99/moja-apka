import { randomBytes } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { hashSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/session';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Podaj poprawny email i haslo.' }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const claimedUsers = await prisma.user.count({
    where: {
      email: {
        not: null
      }
    }
  });

  if (claimedUsers === 0) {
    return NextResponse.json({ error: 'Najpierw utworz pierwsze konto.' }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: 'Niepoprawny email lub haslo.' }, { status: 401 });
  }

  const now = new Date();

  if (user.lockedUntil && user.lockedUntil > now) {
    return NextResponse.json(
      {
        error: 'Za duzo prob. Sprobuj ponownie za chwile.'
      },
      { status: 429 }
    );
  }

  const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!isValid) {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = shouldLock ? new Date(now.getTime() + LOCK_MINUTES * 60 * 1000) : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : attempts,
        lockedUntil
      }
    });

    return NextResponse.json(
      {
        error: shouldLock ? 'Konto czasowo zablokowane po wielu probach.' : 'Niepoprawny email lub haslo.'
      },
      { status: shouldLock ? 429 : 401 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });

  const token = randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt
    }
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS
  });

  return response;
}
