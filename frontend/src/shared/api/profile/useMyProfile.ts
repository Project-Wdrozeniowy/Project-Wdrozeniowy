import { getCurrentProfileQueryKey, useCurrentProfile } from '@/shared/api/generated/orbita.api';
import { useStore } from '@/store';

/** Scoped by user id, so one account's cached profile can never be served to another. */
export const myProfileQueryKey = (userId: number | undefined) =>
  [...getCurrentProfileQueryKey(), userId] as const;

/** The signed-in user's own profile, always read from the server. */
export function useMyProfile() {
  const userId = useStore((state) => state.user?.id);

  return useCurrentProfile({
    query: {
      queryKey: myProfileQueryKey(userId),
      // The page shows its own fixed error message; the global toast would print server text.
      enabled: userId !== undefined,
    },
    request: { skipErrorToast: true },
  });
}
