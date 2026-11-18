import type { StateCreator } from 'zustand';
import type { UserProfileDto as UserProfile } from '@/shared/api/generated/models/userProfileDto.dto';

export type SessionStatus = 'checking' | 'authenticated' | 'guest' | 'error';
export interface AuthSlice {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  sessionStatus: SessionStatus;
  setAuth: (user: UserProfile) => void;
  setInitialized: () => void;
  setSessionStatus: (status: SessionStatus) => void;
  updateUser: (user: UserProfile) => void;
  logout: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  sessionStatus: 'checking',
  setAuth: (user) =>
    set({ user, isAuthenticated: true, isInitialized: true, sessionStatus: 'authenticated' }),
  setInitialized: () =>
    set((state) => ({
      isInitialized: true,
      sessionStatus: state.isAuthenticated ? 'authenticated' : 'guest',
    })),
  setSessionStatus: (status) =>
    set({
      user: null,
      isAuthenticated: false,
      isInitialized: status !== 'checking',
      sessionStatus: status,
    }),
  updateUser: (user) => set((state) => (state.isAuthenticated ? { user } : state)),
  logout: () =>
    set({ user: null, isAuthenticated: false, isInitialized: true, sessionStatus: 'guest' }),
});
