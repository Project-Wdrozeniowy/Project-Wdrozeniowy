'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import type { User } from '@/types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: NonNullable<User['role']>[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const user = useStore((s) => s.user);

  const hasAccess = user?.role !== undefined && allowedRoles.includes(user.role);

  useEffect(() => {
    if (user !== null && !hasAccess) {
      router.replace('/');
    }
  }, [user, hasAccess, router]);

  if (!hasAccess) return null;

  return <>{children}</>;
}
