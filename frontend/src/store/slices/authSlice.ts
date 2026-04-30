import type { StateCreator } from 'zustand';
import type { UserProfile } from '@/types';

export interface AuthSlice {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserProfile, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const getInitialToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem('accessToken');
  } catch {
    return null;
  }
};

export const createAuthSlice: StateCreator<AuthSlice> = (set) => {
  const accessToken = getInitialToken();

  return {
    user: null,
    accessToken,
    refreshToken: null,
    isAuthenticated: Boolean(accessToken),
    setAuth: (user, accessToken, refreshToken) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        } catch {
          // ignore storage errors (e.g. privacy mode)
        }
      }

      set({ user, accessToken, refreshToken, isAuthenticated: true });
    },
    logout: () => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        } catch {
          // ignore storage errors (e.g. privacy mode)
        }
      }

      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    },
  };
};
