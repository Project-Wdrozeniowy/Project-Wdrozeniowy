import type { StateCreator } from 'zustand';

/**
 * Where the client is in restoring and changing the server session. This is client-only lifecycle
 * state; who the user is lives in the TanStack Query cache (`shared/api/profile/currentUser.ts`),
 * never here, so there is no second copy of the profile to keep in step.
 *
 * - `checking`: the session is being read or changed (page load, sign-in, registration, sign-out,
 *   another tab's change). Nobody is treated as signed in until it ends.
 * - `authenticated`: the server confirmed a session, and its profile is in the cache.
 * - `guest`: the server confirmed there is no session.
 * - `error`: the check failed without an answer (network, 5xx). The identity is unknown, so the
 *   user is shown as a guest, the failed action is not repeated, and a retry is offered.
 */
export type SessionStatus = 'checking' | 'authenticated' | 'guest' | 'error';

export interface AuthSlice {
  /** Derived from `sessionStatus` by the actions below: only `authenticated` is true. */
  isAuthenticated: boolean;
  /**
   * False until the first session check has ended, then true for good (also during later checks).
   * Guards and "sign in" prompts wait for it: before it, a guest and a signed-in user look the same.
   */
  isInitialized: boolean;
  sessionStatus: SessionStatus;
  /** The server confirmed a session. Its profile must already be in the cache. */
  setAuthenticated: () => void;
  setInitialized: () => void;
  setSessionStatus: (status: SessionStatus) => void;
  logout: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  isAuthenticated: false,
  isInitialized: false,
  sessionStatus: 'checking',
  setAuthenticated: () =>
    set({ isAuthenticated: true, isInitialized: true, sessionStatus: 'authenticated' }),
  setInitialized: () =>
    set((state) => ({
      isInitialized: true,
      sessionStatus: state.isAuthenticated ? 'authenticated' : 'guest',
    })),
  setSessionStatus: (status) =>
    set({
      isAuthenticated: false,
      isInitialized: status !== 'checking',
      sessionStatus: status,
    }),
  logout: () => set({ isAuthenticated: false, isInitialized: true, sessionStatus: 'guest' }),
});
