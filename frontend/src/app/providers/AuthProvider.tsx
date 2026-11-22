import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { observeSessionChanges, reconcileSession } from '@/shared/auth/session';
import { useStore } from '@/store';
import SessionLoader from '@/app/router/guards/SessionLoader';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const status = useStore((state) => state.sessionStatus);
  const [bootstrapped, setBootstrapped] = useState(false);
  useEffect(() => {
    let mounted = true;
    // The session code keeps the signed-in user's profile in this client's cache.
    const stop = observeSessionChanges(queryClient);
    void reconcileSession().finally(() => {
      if (mounted) setBootstrapped(true);
    });
    return () => {
      mounted = false;
      stop();
    };
  }, [queryClient]);
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
