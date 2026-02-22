import { NextResponse } from 'next/server';

const ONBOARDING_COOKIE = 'pf_onboarded';

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
