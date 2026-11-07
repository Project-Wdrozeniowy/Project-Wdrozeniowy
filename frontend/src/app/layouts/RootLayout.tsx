import { useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import AuthProvider from '@/app/providers/AuthProvider';
import QueryProvider from '@/app/providers/QueryProvider';
import ToastProvider from '@/app/providers/ToastProvider';
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
