import { useMutation, useQueryClient } from '@tanstack/react-query';
import { myProfileQueryKey } from '@/hooks/useMyProfile';
import { userService } from '@/services/userService';
import { useStore } from '@/store';
import type { UpdateProfileRequest } from '@/shared/types';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateUser = useStore((state) => state.updateUser);

  return useMutation({
    // The form maps failures to its own messages; the global toast would print server text.
    mutationFn: (request: UpdateProfileRequest) =>
      userService.updateMyProfile(request, { skipErrorToast: true }),
    onSuccess: async (profile) => {
      const key = myProfileQueryKey(profile.id);
      // A refresh that started before the save would overwrite the saved profile when it lands.
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData(key, profile);
      // The header and sidebar read the user from the store.
      updateUser(profile);
    },
  });
}
