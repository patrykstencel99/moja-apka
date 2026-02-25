import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE } from '@/lib/session-constants';

function isPublicPath(pathname: string) {
  return pathname === '/login';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === '/') {
    return NextResponse.redirect(new URL(hasSession ? '/today' : '/login', request.url));
  }

  if (!hasSession && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg).*)']
};
