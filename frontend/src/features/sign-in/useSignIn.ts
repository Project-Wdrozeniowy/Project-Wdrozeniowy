import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  INVALID_CREDENTIALS_MESSAGE,
  SIGN_IN_FAILED_MESSAGE,
} from '@/features/sign-in/login.const';
import type { LoginFormData } from '@/features/sign-in/login.schema';
import { authService } from '@/shared/api/auth/authClient';
import { apiErrorMessage, apiErrorStatus } from '@/shared/api/client/apiError';
import { toast } from '@/shared/lib/toast';
import { useStore } from '@/store';

/**
 * Signing in: the request, the profile that goes with the new token, the shared session state,
 * the greeting and the way on to the home page. The form only shows what this reports.
 */
export function useSignIn() {
  const router = useRouter();
  const setAuth = useStore((state) => state.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  async function signIn(data: LoginFormData) {
    setServerError(null);
    try {
      const { accessToken } = await authService.login(data);
      const user = await authService.loadProfile(accessToken);
      setAuth(user, accessToken);
      toast.success(`Welcome back, ${user.displayName ?? user.username}!`);
      router.push('/');
    } catch (err: unknown) {
      setServerError(
        apiErrorStatus(err) === 401
          ? INVALID_CREDENTIALS_MESSAGE
          : apiErrorMessage(err, SIGN_IN_FAILED_MESSAGE)
      );
    }
  }

  return { signIn, serverError };
}
