import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getRegisterError, toRegisterRequest } from '@/features/sign-up/register';
import type { RegisterError } from '@/features/sign-up/register';
import type { RegisterFormData } from '@/features/sign-up/register.schema';
import { authService } from '@/shared/api/auth/authClient';
import { toast } from '@/shared/lib/toast';
import { useStore } from '@/store';

/**
 * Creating an account: the request, the profile that goes with the new token, the shared session
 * state, the confirmation and the way on to the home page. A failure is reported as the fields the
 * server rejected (`onRejectedFields`, for the form to mark) or as a message for the whole form.
 */
export function useSignUp(onRejectedFields: (fields: RegisterError['fields']) => void) {
  const router = useRouter();
  const setAuth = useStore((state) => state.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  async function signUp(data: RegisterFormData) {
    setServerError(null);
    try {
      const { accessToken } = await authService.register(toRegisterRequest(data));
      const user = await authService.loadProfile(accessToken);
      setAuth(user, accessToken);
      toast.success('Your account has been created.');
      router.push('/');
    } catch (err: unknown) {
      const { fields, form } = getRegisterError(err);
      if (Object.keys(fields).length > 0) onRejectedFields(fields);
      setServerError(form ?? null);
    }
  }

  return { signUp, serverError };
}
