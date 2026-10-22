import {
  PASSWORD_CHANGE_ERROR_MESSAGE,
  PASSWORD_FIELD_ERRORS,
} from '@/features/change-password/changePassword.const';
import type { PasswordField } from '@/features/change-password/changePassword.const';
import type { ChangePasswordFormData } from '@/features/change-password/changePassword.schema';
import { apiErrorStatus } from '@/shared/api/client/apiError';
import type { ProblemDetail } from '@/shared/api/client/problem.dto';
import type { ChangePasswordRequest } from '@/shared/api/user/user.dto';

/** The request body: only what the API takes. The repeated password is a form-only check. */
export function toChangePasswordRequest(values: ChangePasswordFormData): ChangePasswordRequest {
  return { currentPassword: values.currentPassword, newPassword: values.newPassword };
}

export interface PasswordChangeError {
  /** Messages to show under specific inputs. */
  fields: Partial<Record<PasswordField, string>>;
  /** A message for the whole form, set when no field is to blame. */
  form?: string;
}

/**
 * Turns a failed change into messages written by us; server texts are never shown.
 * The API answers 400 both for an invalid body (with the offending fields) and for a wrong
 * current password (without any), so a 400 with no field is the current password. A 401 never
 * gets here: the API client refreshes the session or sends the user to /login.
 */
export function getPasswordChangeError(error: unknown): PasswordChangeError {
  if (apiErrorStatus(error) === 400) {
    const body = (error as { response?: { data?: ProblemDetail } }).response?.data;
    const rejected = Object.keys(body?.errors ?? {});
    if (rejected.length === 0) {
      return { fields: { currentPassword: PASSWORD_FIELD_ERRORS.currentIncorrect } };
    }
    const fields: PasswordChangeError['fields'] = {};
    if (rejected.includes('newPassword')) fields.newPassword = PASSWORD_FIELD_ERRORS.newRejected;
    if (rejected.includes('currentPassword')) {
      fields.currentPassword = PASSWORD_FIELD_ERRORS.currentRequired;
    }
    if (Object.keys(fields).length > 0) return { fields };
  }
  return { fields: {}, form: PASSWORD_CHANGE_ERROR_MESSAGE };
}
