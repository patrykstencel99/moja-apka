import { randomBytes } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { hashPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { hashSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/session';

const schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128)
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Hasla musza byc identyczne.',
    path: ['confirmPassword']
  });

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Niepoprawne dane.' }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const passwordHash = await hashPassword(parsed.data.password);

  const claimedUsers = await prisma.user.count({
    where: {
      email: {
        not: null
      }
    }
  });

  if (claimedUsers > 0) {
    return NextResponse.json({ error: 'Pierwsze konto zostalo juz utworzone.' }, { status: 403 });
  }

  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) {
    return NextResponse.json({ error: 'Ten email jest juz zajety.' }, { status: 409 });
  }

  const placeholder = await prisma.user.findFirst({
    where: {
      email: null
    },
    orderBy: { createdAt: 'asc' }
  });

  const user = placeholder
    ? await prisma.user.update({
        where: { id: placeholder.id },
        data: {
          email,
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null
        }
      })
    : await prisma.user.create({
        data: {
          email,
          passwordHash,
          timezone: 'Europe/Warsaw'
        }
      });

  await prisma.gamificationState.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {}
  });

  const token = randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(token);
  const now = new Date();
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
