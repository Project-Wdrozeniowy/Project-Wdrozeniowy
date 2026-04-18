import type { StateCreator } from 'zustand';
import type { User } from '@/shared/types';

export interface AuthSlice {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User, token: string) => void;
  logout: () => void;
}

const getInitialToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

export const createAuthSlice: StateCreator<AuthSlice> = (set) => {
  const token = getInitialToken();

  return {
    user: null,
    token,
    isAuthenticated: Boolean(token),
    setUser: (user, token) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('token', token);
        } catch {
          // ignore storage errors (e.g. privacy mode)
        }
      }

      set({ user, token, isAuthenticated: Boolean(token) });
    },
    logout: () => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('token');
        } catch {
          // ignore storage errors (e.g. privacy mode)
        }
      }

      set({ user: null, token: null, isAuthenticated: false });
    },
  };
};
