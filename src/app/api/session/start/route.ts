import { randomBytes } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ensureAuthBootstrap } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyPin } from '@/lib/pin';
import { hashSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/session';

const bodySchema = z.object({
  pin: z.string().min(4).max(24)
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Podaj poprawny PIN.' }, { status: 400 });
  }

  const user = await ensureAuthBootstrap();
  const now = new Date();

  if (user.lockedUntil && user.lockedUntil > now) {
    return NextResponse.json(
      {
        error: 'Za duzo prob. Sprobuj ponownie za chwile.'
      },
      { status: 429 }
    );
  }

  const isValid = await verifyPin(parsed.data.pin, user.pinHash);
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
        error: shouldLock ? 'Konto czasowo zablokowane po wielu probach.' : 'Niepoprawny PIN.'
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
