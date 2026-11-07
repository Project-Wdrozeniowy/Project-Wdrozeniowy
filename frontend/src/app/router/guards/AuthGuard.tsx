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

  useEffect(() => {
    // Until AuthProvider has tried the refresh cookie, a guest and a signed-in user look the same.
    if (isInitialized && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isInitialized, isAuthenticated, navigate]);

  if (!isInitialized) return <SessionLoader />;
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
