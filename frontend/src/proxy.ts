import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];
const PROTECTED_ROUTES = ['/', '/forum', '/profile', '/dashboard', '/saved', '/settings', '/notifications', '/messages', '/stats', '/achievements'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('orbita_session');
  const isAuthenticated = Boolean(sessionCookie?.value);
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/'),
  );

  // Authenticated user tries to access login/register → send home
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Unauthenticated user tries to access a protected route → send to login
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
