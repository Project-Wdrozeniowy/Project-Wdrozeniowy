'use client';

import { useEffect } from 'react';
import { authService } from '@/services/authService';
import { useStore } from '@/store';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser } = useStore();

  useEffect(() => {
    authService
      .me()
      .then((data) => {
        setUser(data.user, data.accessToken);
      })
      .catch(() => {
        // No valid session — user stays logged out
      });
  }, [setUser]);

  return <>{children}</>;
}
