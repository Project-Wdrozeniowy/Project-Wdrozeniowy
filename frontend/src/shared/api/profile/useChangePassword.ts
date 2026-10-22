import { useMutation } from '@tanstack/react-query';
import { userService } from '@/shared/api/user/userClient';
import type { ChangePasswordRequest } from '@/shared/api/user/user.dto';

export function useChangePassword() {
  return useMutation({
    // The form maps failures to its own messages; the global toast would print server text.
    mutationFn: (request: ChangePasswordRequest) =>
      userService.changePassword(request, { skipErrorToast: true }),
  });
}
