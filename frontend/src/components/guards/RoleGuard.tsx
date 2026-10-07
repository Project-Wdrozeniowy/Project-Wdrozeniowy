'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import type { UserRole } from '@/shared/types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const user = useStore((s) => s.user);

  const hasAccess = user !== null && allowedRoles.includes(user.role);
  // Authenticated but profile not loaded yet — wait instead of denying.
  const isPending = isAuthenticated && user === null;

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (!isPending && !hasAccess) {
      router.replace('/');
    }
  }, [isAuthenticated, isPending, hasAccess, router]);

  if (!hasAccess) return null;

  return <>{children}</>;
}
