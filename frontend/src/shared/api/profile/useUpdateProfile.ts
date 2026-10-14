import { useMutation, useQueryClient } from '@tanstack/react-query';
import { myProfileQueryKey } from '@/shared/api/profile/useMyProfile';
import { userService } from '@/shared/api/user/userClient';
import { useStore } from '@/store';
import type { UpdateProfileRequest } from '@/shared/api/user/user.dto';

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
