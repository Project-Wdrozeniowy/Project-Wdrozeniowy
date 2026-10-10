import { z } from 'zod';
import {
  AVATAR_URL_MAX_LENGTH,
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  PROFILE_FIELD_ERRORS,
} from '@/constants/profile';

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** Mirrors the backend rules of `PATCH /users/me`, so most mistakes are caught before the request. */
export const profileSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, PROFILE_FIELD_ERRORS.emailRequired)
    .max(EMAIL_MAX_LENGTH, PROFILE_FIELD_ERRORS.emailTooLong)
    .email(PROFILE_FIELD_ERRORS.emailInvalid),
  displayName: z
    .string()
    .trim()
    .max(DISPLAY_NAME_MAX_LENGTH, PROFILE_FIELD_ERRORS.displayNameTooLong),
  avatarUrl: z
    .string()
    .trim()
    .max(AVATAR_URL_MAX_LENGTH, PROFILE_FIELD_ERRORS.avatarUrlTooLong)
    // The API also accepts other schemes (ftp://...); browsers can only show http(s) images.
    .refine((value) => value === '' || isHttpUrl(value), {
      message: PROFILE_FIELD_ERRORS.avatarUrlInvalid,
    }),
  bio: z.string().trim().max(BIO_MAX_LENGTH, PROFILE_FIELD_ERRORS.bioTooLong),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
