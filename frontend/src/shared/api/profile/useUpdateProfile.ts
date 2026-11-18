import { useQueryClient } from '@tanstack/react-query';
import { myProfileQueryKey } from '@/shared/api/profile/useMyProfile';
import { useUpdateProfile as useUpdateProfileMutation } from '@/shared/api/generated/orbita.api';
import { useStore } from '@/store';
import { sessionEvents } from '@/shared/auth/sessionEvents';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateUser = useStore((state) => state.updateUser);

  return useUpdateProfileMutation({
    request: { skipErrorToast: true },
    mutation: {
      // The form maps failures to its own messages; the global toast would print server text.
      onSuccess: async (profile) => {
        const generation = sessionEvents.current();
        const currentUser = useStore.getState().user;
        if (!useStore.getState().isAuthenticated || currentUser?.id !== profile.id) return;
        const key = myProfileQueryKey(profile.id);
        // A refresh that started before the save would overwrite the saved profile when it lands.
        await queryClient.cancelQueries({ queryKey: key });
        if (generation !== sessionEvents.current() || useStore.getState().user?.id !== profile.id)
          return;
        queryClient.setQueryData(key, profile);
        // The header and sidebar read the user from the store.
        updateUser(profile);
      },
    },
  });
}
