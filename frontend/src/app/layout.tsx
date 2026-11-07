import { useEffect, useRef } from 'react';
import {
  Outlet,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
  Link,
  useLocation,
} from 'react-router';
import AuthProvider from '@/app/_providers/AuthProvider';
import QueryProvider from '@/app/_providers/QueryProvider';
import ToastProvider from '@/app/_providers/ToastProvider';
export default function RootLayout() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    // Route changes move keyboard/screen-reader focus to the new content.
    // Query-only changes retain filter/pagination focus, as in the original UI.
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    const content = document.querySelector<HTMLElement>('main');
    content?.setAttribute('tabindex', '-1');
    content?.focus({ preventScroll: true });
  }, [pathname]);
  return (
    <QueryProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
      <ToastProvider />
      <ScrollRestoration />
    </QueryProvider>
  );
}
export function RouteError() {
  const error = useRouteError();
  return (
    <main className="min-h-screen bg-slate-900 p-8 text-gray-50">
      <h1>
        {isRouteErrorResponse(error) && error.status === 404
          ? 'Page not found'
          : 'Could not load this page'}
      </h1>
      <Link to="/">Return home</Link>
    </main>
  );
}
