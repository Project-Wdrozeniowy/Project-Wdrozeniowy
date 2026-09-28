import type { Request, Response, NextFunction } from 'express';

const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];
const PROTECTED_ROUTES = [
  '/',
  '/forum',
  '/profile',
  '/dashboard',
  '/saved',
  '/settings',
  '/notifications',
  '/messages',
  '/stats',
  '/achievements',
];

export function authGuard(req: Request, res: Response, next: NextFunction): void {
  const pathname = req.path;
  const cookies = req.cookies as Record<string, string | undefined>;
  const isAuthenticated = Boolean(cookies.orbita_session);
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  );

  if (isAuthenticated && isAuthRoute) {
    res.redirect('/');
    return;
  }

  if (!isAuthenticated && isProtectedRoute) {
    const from = encodeURIComponent(req.originalUrl);
    res.redirect(`/login?from=${from}`);
    return;
  }

  next();
}
