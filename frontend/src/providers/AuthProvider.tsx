'use client';

import { useEffect } from 'react';
import { apiClient } from '@/services/api';
import { authService } from '@/services/authService';
import { useStore } from '@/store';

/**
 * Restores the session on page load. The access token only lives in memory, so after a
 * reload it is re-issued from the httpOnly refresh cookie. No cookie means a guest.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuth = useStore((s) => s.setAuth);
  const setInitialized = useStore((s) => s.setInitialized);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const accessToken = await apiClient.refreshAccessToken();
        const user = await authService.loadProfile(accessToken);
        if (!cancelled) setAuth(user, accessToken);
      } catch {
        // No valid session: stay a guest.
      } finally {
        if (!cancelled) setInitialized();
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [setAuth, setInitialized]);

  return <>{children}</>;
}
