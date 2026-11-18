import { z } from 'zod';
import {
  NEW_PASSWORD_MAX_LENGTH,
  NEW_PASSWORD_MIN_LENGTH,
  PASSWORD_FIELD_ERRORS,
} from '@/features/change-password/changePassword.const';

/**
 * Mirrors the backend rules of `POST /users/me/password`. Passwords are never trimmed: spaces
 * are part of a password, and the server compares the text as it is typed.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, PASSWORD_FIELD_ERRORS.currentRequired),
    newPassword: z
      .string()
      .min(1, PASSWORD_FIELD_ERRORS.newRequired)
      .min(NEW_PASSWORD_MIN_LENGTH, PASSWORD_FIELD_ERRORS.newTooShort)
      .max(NEW_PASSWORD_MAX_LENGTH, PASSWORD_FIELD_ERRORS.newTooLong),
    confirmPassword: z.string().min(1, PASSWORD_FIELD_ERRORS.confirmRequired),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: PASSWORD_FIELD_ERRORS.confirmMismatch,
    path: ['confirmPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
