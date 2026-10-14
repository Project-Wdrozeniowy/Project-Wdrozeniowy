import type { StateCreator } from 'zustand';
import type { UserProfile } from '@/shared/api/user/user.dto';
import { tokenMemory } from '@/shared/auth/tokenMemory';

export interface AuthSlice {
  user: UserProfile | null;
  isAuthenticated: boolean;
  /** False until the first session-restore attempt (refresh cookie) has finished. */
  isInitialized: boolean;
  setAuth: (user: UserProfile, accessToken: string) => void;
  setInitialized: () => void;
  /** Replaces the signed-in user's data, e.g. after a profile edit. Ignored for guests. */
  updateUser: (user: UserProfile) => void;
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

  updateUser: (user) => set((state) => (state.isAuthenticated ? { user } : state)),

  logout: () => {
    tokenMemory.set(null);
    set({ user: null, isAuthenticated: false });
  },
});
