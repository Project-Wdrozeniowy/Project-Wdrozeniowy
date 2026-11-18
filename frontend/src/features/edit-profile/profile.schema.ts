import { z } from 'zod';
import {
  AVATAR_URL_MAX_LENGTH,
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  PROFILE_FIELD_ERRORS,
  PROFILE_FIELDS,
} from '@/features/edit-profile/profile.const';
import type { ProfileField } from '@/features/edit-profile/profile.const';
import { isHttpUrl } from '@/shared/lib/url';

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

/**
 * The schema for a form that shows only some fields. A field the form does not show keeps its
 * value but is not checked: stored data can predate the rules, and the user could not fix it here.
 */
export function profileSchemaFor(shown: readonly ProfileField[]): typeof profileSchema {
  const unchecked = Object.fromEntries(
    PROFILE_FIELDS.filter((field) => !shown.includes(field)).map((field) => [field, z.string()])
  );
  return profileSchema.extend(unchecked) as typeof profileSchema;
}
