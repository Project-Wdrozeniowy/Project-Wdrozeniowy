import { useEffect } from 'react';
import { observeSessionChanges, reconcileSession } from '@/shared/auth/session';
import { useStore } from '@/store';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const status = useStore((state) => state.sessionStatus);
  useEffect(() => {
    const stop = observeSessionChanges();
    void reconcileSession();
    return stop;
  }, []);
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
