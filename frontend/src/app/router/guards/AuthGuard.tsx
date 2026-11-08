import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '@/store';
import SessionLoader from './SessionLoader';

interface AuthGuardProps {
  children: React.ReactNode;
}

/** Renders its children for signed-in users and sends everyone else to /login. */
export default function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const isInitialized = useStore((s) => s.isInitialized);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const status = useStore((s) => s.sessionStatus);

  useEffect(() => {
    // Until AuthProvider has checked the server session, a guest and a signed-in user look the same.
    if (isInitialized && !isAuthenticated && status !== 'error') {
      navigate('/login', { replace: true });
    }
  }, [isInitialized, isAuthenticated, status, navigate]);

  if (!isInitialized) return <SessionLoader />;
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
