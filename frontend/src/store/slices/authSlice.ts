import type { StateCreator } from 'zustand';
import type { UserProfile } from '@/shared/types';
import { tokenMemory } from '@/lib/tokenMemory';

export interface AuthSlice {
  user: UserProfile | null;
  isAuthenticated: boolean;
  /** False until the first session-restore attempt (refresh cookie) has finished. */
  isInitialized: boolean;
  setAuth: (user: UserProfile, accessToken: string) => void;
  setInitialized: () => void;
  logout: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (user, accessToken) => {
    tokenMemory.set(accessToken);
    set({ user, isAuthenticated: true, isInitialized: true });
  },

  setInitialized: () => set({ isInitialized: true }),

  logout: () => {
    tokenMemory.set(null);
    set({ user: null, isAuthenticated: false });
  },
});
