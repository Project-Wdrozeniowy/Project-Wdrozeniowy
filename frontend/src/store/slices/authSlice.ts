import type { StateCreator } from 'zustand';
import type { User } from '@/types';
import { tokenStorage } from '@/services/authService';

export interface AuthSlice {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => {
  const token = tokenStorage.getToken();
  const refreshToken = tokenStorage.getRefreshToken();

  return {
    user: null,
    token,
    refreshToken,
    isAuthenticated: Boolean(token),

    setUser: (user, token, refreshToken) => {
      tokenStorage.setTokens(token, refreshToken);
      set({ user, token, refreshToken: refreshToken ?? null, isAuthenticated: Boolean(token) });
    },

    logout: () => {
      tokenStorage.clearTokens();
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    },
  };
};
