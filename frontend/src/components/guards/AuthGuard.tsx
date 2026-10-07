'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import SessionLoader from './SessionLoader';

/** Renders its children for signed-in users and sends everyone else to /login. */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isInitialized = useStore((s) => s.isInitialized);
  const isAuthenticated = useStore((s) => s.isAuthenticated);

  useEffect(() => {
    // Until AuthProvider has tried the refresh cookie, a guest and a signed-in user look the same.
    if (isInitialized && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitialized, isAuthenticated, router]);

  if (!isInitialized) return <SessionLoader />;
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
