import { apiErrorStatus } from '@/shared/api/client/apiError';
import type { ProblemDetail } from '@/shared/api/client/problem.dto';
import type { RegisterRequest } from '@/shared/api/auth/auth.dto';
import {
  REGISTER_ERROR_MESSAGE,
  REGISTER_FIELD_ERRORS,
  REGISTER_FIELDS,
} from '@/features/sign-up/register.const';
import type { RegisterField } from '@/features/sign-up/register.const';
import type { RegisterFormData } from '@/features/sign-up/register.schema';

/**
 * The body of `POST /auth/register`: only what the API takes. The repeated password and the
 * terms checkbox are form-only, and the interests are not collected at all (PWDRZ-154). The
 * display name is sent only when there is one: the API rejects an empty or blank value and shows
 * the username when it is left out.
 */
export function toRegisterRequest(values: RegisterFormData): RegisterRequest {
  const request: RegisterRequest = {
    username: values.username,
    email: values.email,
    password: values.password,
  };
  // Trimmed here as well as by the schema: this must stay correct for any caller.
  const displayName = values.displayName.trim();
  if (displayName) request.displayName = displayName;
  return request;
}

function isRegisterField(key: string): key is RegisterField {
  return (REGISTER_FIELDS as readonly string[]).includes(key);
}

export interface RegisterError {
  /** Messages to show under specific inputs. */
  fields: Partial<Record<RegisterField, string>>;
  /** A message for the whole form, set when no field is to blame. */
  form?: string;
}

/**
 * Turns a failed registration into messages written by us; server texts are never shown.
 * A 400 names the rejected fields. A 409 means the username or the email is taken: only its
 * detail tells which, and that text is used to choose the field, never displayed.
 */
export function getRegisterError(error: unknown): RegisterError {
  const status = apiErrorStatus(error);
  const body = (error as { response?: { data?: ProblemDetail } }).response?.data;

  if (status === 400) {
    const fields: RegisterError['fields'] = {};
    for (const key of Object.keys(body?.errors ?? {})) {
      if (isRegisterField(key)) fields[key] = REGISTER_FIELD_ERRORS.invalid[key];
    }
    if (Object.keys(fields).length > 0) return { fields };
  }

  if (status === 409) {
    const detail = (body?.detail ?? '').toLowerCase();
    if (detail.includes('username'))
      return { fields: { username: REGISTER_FIELD_ERRORS.usernameTaken } };
    if (detail.includes('email')) return { fields: { email: REGISTER_FIELD_ERRORS.emailTaken } };
  }

  return { fields: {}, form: REGISTER_ERROR_MESSAGE };
}
