import { useNavigate } from 'react-router';
import { useState } from 'react';
import { getRegisterError, toRegisterRequest } from '@/features/sign-up/register';
import { REGISTER_ERROR_MESSAGE } from '@/features/sign-up/register.const';
import { authPostStatus } from '@/shared/api/client/apiError';
import type { RegisterError } from '@/features/sign-up/register';
import type { RegisterFormData } from '@/features/sign-up/register.schema';
import { register } from '@/shared/api/generated/orbita.api';
import { authenticateSession } from '@/shared/auth/session';
import { toast } from '@/shared/lib/toast';

export function useSignUp(onRejectedFields: (fields: RegisterError['fields']) => void) {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  async function signUp(data: RegisterFormData) {
    setServerError(null);
    try {
      const user = await authenticateSession((signal) =>
        register(toRegisterRequest(data), { signal, skipErrorToast: true })
      );
      if (!user) return;
      toast.success('Your account has been created.');
      navigate('/');
    } catch (err: unknown) {
      if (authPostStatus(err, 'register') === undefined) {
        setServerError(REGISTER_ERROR_MESSAGE);
        return;
      }
      const { fields, form } = getRegisterError(err);
      if (Object.keys(fields).length > 0) onRejectedFields(fields);
      setServerError(form ?? null);
    }
  }

  return { signUp, serverError };
}
