import { useEffect, useState } from 'react';
import { observeSessionChanges, reconcileSession } from '@/shared/auth/session';
import { useStore } from '@/store';
import SessionLoader from '@/app/router/guards/SessionLoader';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const status = useStore((state) => state.sessionStatus);
  const [bootstrapped, setBootstrapped] = useState(false);
  useEffect(() => {
    let mounted = true;
    const stop = observeSessionChanges();
    void reconcileSession().finally(() => {
      if (mounted) setBootstrapped(true);
    });
    return () => {
      mounted = false;
      stop();
    };
  }, []);
  // Resolve the initial cookie identity before optional-auth page queries can cache a response.
  // Later explicit auth transitions keep forms mounted so failed submissions preserve input.
  if (!bootstrapped) return <SessionLoader />;
  return (
    <>
      {status === 'error' && (
        <div role="alert">
          Unable to verify your session. Your last action was not repeated.{' '}
          <button
            type="button"
            onClick={() => {
              void reconcileSession();
            }}
          >
            Retry session check
          </button>
        </div>
      )}
      {children}
    </>
  );
}
