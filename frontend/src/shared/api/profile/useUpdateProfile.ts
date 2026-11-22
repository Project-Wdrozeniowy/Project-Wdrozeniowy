import { useQueryClient } from '@tanstack/react-query';
import { currentUserQueryKey } from '@/shared/api/profile/currentUser';
import type { MyProfileDto } from '@/shared/api/generated/models/myProfileDto.dto';
import { useUpdateProfile as useUpdateProfileMutation } from '@/shared/api/generated/orbita.api';
import { useStore } from '@/store';
import { sessionEvents } from '@/shared/auth/sessionEvents';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useUpdateProfileMutation({
    request: { skipErrorToast: true },
    mutation: {
      // The form maps failures to its own messages; the global toast would print server text.
      onSuccess: async (profile) => {
        const generation = sessionEvents.current();
        const cachedId = () => queryClient.getQueryData<MyProfileDto>(currentUserQueryKey)?.id;
        if (!useStore.getState().isAuthenticated || cachedId() !== profile.id) return;
        // A refresh that started before the save would overwrite the saved profile when it lands.
        await queryClient.cancelQueries({ queryKey: currentUserQueryKey });
        if (generation !== sessionEvents.current() || cachedId() !== profile.id) return;
        // The one copy of the profile: the header, the sidebar, the profile and the settings read it.
        queryClient.setQueryData(currentUserQueryKey, profile);
      },
    },
  });
}
