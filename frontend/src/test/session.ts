import type { QueryClient } from '@tanstack/react-query';
import { currentUserQueryKey } from '@/shared/api/profile/currentUser';
import { useStore } from '@/store';

/**
 * The signed-in user's profile has one client copy, in the query cache, and the store holds only
 * the session lifecycle. A test that needs a signed-in user does both: it marks the session
 * authenticated and puts the profile in the cache of the client the component renders with.
 */
export const SIGNED_IN = {
  isAuthenticated: true,
  isInitialized: true,
  sessionStatus: 'authenticated',
} as const;

export const SIGNED_OUT = {
  isAuthenticated: false,
  isInitialized: true,
  sessionStatus: 'guest',
} as const;

export function signInUser(client: QueryClient, user: unknown) {
  client.setQueryData(currentUserQueryKey, user);
  useStore.setState({ ...SIGNED_IN });
}
