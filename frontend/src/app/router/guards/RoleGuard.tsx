import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useCurrentUser } from '@/shared/api/profile/currentUser';
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
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const user = useCurrentUser();
  const status = useStore((s) => s.sessionStatus);

  // Signed in, but the profile (and so the role) is not in the cache yet: not a decision to make.
  const waitingForRole = isAuthenticated && user === undefined;
  const hasAccess = user !== undefined && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!isInitialized || status === 'error' || waitingForRole) return;
    if (user === undefined) {
      navigate('/login', { replace: true });
    } else if (!hasAccess) {
      navigate('/', { replace: true });
    }
  }, [isInitialized, user, hasAccess, waitingForRole, status, navigate]);

  if (!isInitialized || waitingForRole) return <SessionLoader />;
  if (!hasAccess) return null;

  return <>{children}</>;
}
