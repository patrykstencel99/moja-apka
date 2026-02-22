import { NextResponse } from 'next/server';

import { ONBOARDING_COOKIE } from '@/lib/session-constants';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ONBOARDING_COOKIE,
    value: '1',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365
  });

  return response;
}
