'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import type { UserRole } from '@/shared/types';
import SessionLoader from './SessionLoader';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

/**
 * Renders its children for users with one of `allowedRoles`. Guests go to /login, other
 * users to /. This is only a UX layer: the API enforces the same roles with @PreAuthorize.
 */
export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const isInitialized = useStore((s) => s.isInitialized);
  const user = useStore((s) => s.user);

  const hasAccess = user !== null && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!isInitialized) return;
    if (user === null) {
      router.replace('/login');
    } else if (!hasAccess) {
      router.replace('/');
    }
  }, [isInitialized, user, hasAccess, router]);

  if (!isInitialized) return <SessionLoader />;
  if (!hasAccess) return null;

  return <>{children}</>;
}
