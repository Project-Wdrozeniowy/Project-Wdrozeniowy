import { useQueryClient } from '@tanstack/react-query';
import { myProfileQueryKey } from '@/shared/api/profile/useMyProfile';
import { useUpdateProfile as useUpdateProfileMutation } from '@/shared/api/generated/orbita.api';
import { useStore } from '@/store';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateUser = useStore((state) => state.updateUser);

  return useUpdateProfileMutation({
    request: { skipErrorToast: true },
    mutation: {
      // The form maps failures to its own messages; the global toast would print server text.
      onSuccess: async (profile) => {
        const key = myProfileQueryKey(profile.id);
        // A refresh that started before the save would overwrite the saved profile when it lands.
        await queryClient.cancelQueries({ queryKey: key });
        queryClient.setQueryData(key, profile);
        // The header and sidebar read the user from the store.
        updateUser(profile);
      },
    },
  });
}
