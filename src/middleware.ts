import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE } from '@/lib/session-constants';

function isPublicPath(pathname: string) {
  return pathname === '/' || pathname === '/login';
}

function isStaticAssetPath(pathname: string) {
  if (pathname.startsWith('/_next/')) {
    return true;
  }

  if (
    pathname === '/favicon.ico' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/icon.svg' ||
    pathname === '/sw.js'
  ) {
    return true;
  }

  // In dev Next can request JS bundles from root paths (e.g. /react-refresh.js).
  return pathname.includes('.');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api') || isStaticAssetPath(pathname)) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (hasSession && isPublicPath(pathname)) {
    return NextResponse.redirect(new URL('/today', request.url));
  }

  if (!hasSession && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg).*)']
};
