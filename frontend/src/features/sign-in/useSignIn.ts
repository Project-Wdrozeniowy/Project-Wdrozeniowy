import { useNavigate } from 'react-router';
import { useState } from 'react';
import {
  INVALID_CREDENTIALS_MESSAGE,
  SIGN_IN_FAILED_MESSAGE,
} from '@/features/sign-in/login.const';
import type { LoginFormData } from '@/features/sign-in/login.schema';
import { login } from '@/shared/api/generated/orbita.api';
import { authenticateSession } from '@/shared/auth/session';
import { apiErrorMessage, apiErrorStatus } from '@/shared/api/client/apiError';
import { toast } from '@/shared/lib/toast';

/**
 * Signing in: the request, the profile that goes with the new token, the shared session state,
 * the greeting and the way on to the home page. The form only shows what this reports.
 */
export function useSignIn() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  async function signIn(data: LoginFormData) {
    setServerError(null);
    try {
      const user = await authenticateSession((signal) =>
        login(data, { signal, skipErrorToast: true })
      );
      if (!user) return;
      toast.success(`Welcome back, ${user.displayName ?? user.username}!`);
      navigate('/');
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
