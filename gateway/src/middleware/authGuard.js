'use strict';

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

function authGuard(req, res, next) {
  const pathname = req.path;
  const isAuthenticated = Boolean(req.cookies?.orbita_session);
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/'),
  );

  if (isAuthenticated && isAuthRoute) {
    return res.redirect('/');
  }

  if (!isAuthenticated && isProtectedRoute) {
    const from = encodeURIComponent(pathname);
    return res.redirect(`/login?from=${from}`);
  }

  next();
}

module.exports = { authGuard };
