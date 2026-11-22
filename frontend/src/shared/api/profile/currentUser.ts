import { getCurrentProfileQueryKey, useCurrentProfile } from '@/shared/api/generated/orbita.api';
import type { MyProfileDto } from '@/shared/api/generated/models/myProfileDto.dto';
import { useStore } from '@/store';

/**
 * The signed-in user's profile has ONE client copy: this entry of the TanStack Query cache. The
 * session code (`shared/auth/session.ts`) writes it when the server confirms a session, a profile
 * save writes the server's answer, and every screen (header, sidebar, guards, profile, settings)
 * reads it, so a change shows everywhere and nothing is synchronised by hand. The cache is cleared
 * on sign-out and when another account takes over, so one account's profile is never served to the
 * next. The store holds only the session lifecycle (`authSlice`).
 */
export const currentUserQueryKey = getCurrentProfileQueryKey();

/**
 * Who is signed in, or `undefined` for a guest and while the session is being checked. It asks the
 * server for nothing in the normal case: the session code keeps the entry current. Only if the
 * entry is missing while a session is confirmed (it was removed from the cache) does it read it
 * again once, so the app repairs itself instead of staying without a user.
 */
export function useCurrentUser(): MyProfileDto | undefined {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const { data } = useCurrentProfile({
    query: {
      queryKey: currentUserQueryKey,
      enabled: isAuthenticated,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    },
    request: { skipErrorToast: true },
  });
  // A cleared or stale entry (a session that ended) is never shown to a guest.
  return isAuthenticated ? data : undefined;
}

/**
 * The signed-in user's own profile for the profile and settings pages: the same entry, read from
 * the server when a page opens (so the page never shows older data than the server has), and kept
 * on screen if that read fails.
 */
export function useMyProfile() {
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  return useCurrentProfile({
    query: {
      queryKey: currentUserQueryKey,
      // The page shows its own fixed error message; the global toast would print server text.
      enabled: isAuthenticated,
      staleTime: 0,
      // The session check on focus already refreshes the entry.
      refetchOnWindowFocus: false,
    },
    request: { skipErrorToast: true },
  });
}
