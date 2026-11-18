import { useNavigate } from 'react-router';
import { useState } from 'react';
import {
  INVALID_CREDENTIALS_MESSAGE,
  SIGN_IN_FAILED_MESSAGE,
} from '@/features/sign-in/login.const';
import type { LoginFormData } from '@/features/sign-in/login.schema';
import { login } from '@/shared/api/generated/orbita.api';
import { authenticateSession } from '@/shared/auth/session';
import { apiErrorMessage, authPostStatus } from '@/shared/api/client/apiError';
import { toast } from '@/shared/lib/toast';

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
      const status = authPostStatus(err, 'login');
      if (status === 401) setServerError(INVALID_CREDENTIALS_MESSAGE);
      else if (status !== undefined) setServerError(apiErrorMessage(err, SIGN_IN_FAILED_MESSAGE));
      else setServerError(SIGN_IN_FAILED_MESSAGE);
    }
  }

  return { signIn, serverError };
}
