import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import { useStore } from '@/store';

/** Scoped by user id, so one account's cached profile can never be served to another. */
export const myProfileQueryKey = (userId: number | undefined) => ['my-profile', userId] as const;

/** The signed-in user's own profile, always read from the server. */
export function useMyProfile() {
  const userId = useStore((state) => state.user?.id);

  return useQuery({
    queryKey: myProfileQueryKey(userId),
    // The page shows its own fixed error message; the global toast would print server text.
    queryFn: () => userService.getMyProfile({ skipErrorToast: true }),
    enabled: userId !== undefined,
  });
}
