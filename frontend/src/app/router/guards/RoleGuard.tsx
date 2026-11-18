import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '@/store';
import type { UserProfileDtoRole as UserRole } from '@/shared/api/generated/models/userProfileDtoRole.dto';
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
  const navigate = useNavigate();
  const isInitialized = useStore((s) => s.isInitialized);
  const user = useStore((s) => s.user);
  const status = useStore((s) => s.sessionStatus);

  const hasAccess = user !== null && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!isInitialized || status === 'error') return;
    if (user === null) {
      navigate('/login', { replace: true });
    } else if (!hasAccess) {
      navigate('/', { replace: true });
    }
  }, [isInitialized, user, hasAccess, status, navigate]);

  if (!isInitialized) return <SessionLoader />;
  if (!hasAccess) return null;

  return <>{children}</>;
}
