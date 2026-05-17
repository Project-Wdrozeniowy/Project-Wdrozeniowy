import type { StateCreator } from 'zustand';
import type { AuthUserInfo } from '@/shared/types';
import { tokenMemory } from '@/lib/tokenMemory';

export interface AuthSlice {
  user: AuthUserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUserInfo, token: string) => void;
  logout: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setUser: (user, token) => {
    tokenMemory.set(token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    tokenMemory.set(null);
    set({ user: null, token: null, isAuthenticated: false });
  },
});
