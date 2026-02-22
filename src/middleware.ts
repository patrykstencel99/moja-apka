import { NextRequest, NextResponse } from 'next/server';

import { ONBOARDING_COOKIE, SESSION_COOKIE } from '@/lib/session-constants';

function isPublicPath(pathname: string) {
  return pathname === '/login';
}

function isOnboardingPath(pathname: string) {
  return pathname.startsWith('/onboarding');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isOnboarded = request.cookies.get(ONBOARDING_COOKIE)?.value === '1';

  if (pathname === '/') {
    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (!isOnboarded) {
      return NextResponse.redirect(new URL('/onboarding/system', request.url));
    }

    return NextResponse.redirect(new URL('/today', request.url));
  }

  if (!hasSession && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (hasSession && !isOnboarded && !isOnboardingPath(pathname) && pathname !== '/login') {
    return NextResponse.redirect(new URL('/onboarding/system', request.url));
  }

  if (hasSession && isOnboarded && isOnboardingPath(pathname)) {
    return NextResponse.redirect(new URL('/today', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg).*)']
};
