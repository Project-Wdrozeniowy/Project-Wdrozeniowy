import type { UserRole } from '@/shared/types';

/** Limits of `PATCH /users/me`; they match the backend validation. */
export const EMAIL_MAX_LENGTH = 100;
export const DISPLAY_NAME_MAX_LENGTH = 100;
export const AVATAR_URL_MAX_LENGTH = 500;
export const BIO_MAX_LENGTH = 1000;

/** Editable profile fields, as named by the API. */
export const PROFILE_FIELDS = ['email', 'displayName', 'avatarUrl', 'bio'] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

export const PROFILE_LOAD_ERROR_MESSAGE = 'We could not load your profile. Please try again.';
export const PROFILE_SAVE_ERROR_MESSAGE = 'We could not save your changes. Please try again.';
export const PROFILE_SAVED_MESSAGE = 'Profile saved.';

/**
 * One wording per rule: the form validation and the mapping of server validation errors both use
 * these, so the user reads the same text whichever layer rejects the input. The server's own
 * validation text is never shown (it is not written for end users).
 */
export const PROFILE_FIELD_ERRORS = {
  emailRequired: 'Email is required',
  emailInvalid: 'Please enter a valid email address',
  emailTooLong: `Email must be at most ${EMAIL_MAX_LENGTH} characters`,
  displayNameTooLong: `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters`,
  avatarUrlInvalid: 'Please enter a full link starting with http:// or https://',
  avatarUrlTooLong: `Avatar link must be at most ${AVATAR_URL_MAX_LENGTH} characters`,
  bioTooLong: `Bio must be at most ${BIO_MAX_LENGTH} characters`,
} as const;

/** What the server can reject, in the words of the form. */
export const PROFILE_SERVER_FIELD_ERRORS: Record<ProfileField, string> = {
  email: PROFILE_FIELD_ERRORS.emailInvalid,
  displayName: PROFILE_FIELD_ERRORS.displayNameTooLong,
  avatarUrl: PROFILE_FIELD_ERRORS.avatarUrlInvalid,
  bio: PROFILE_FIELD_ERRORS.bioTooLong,
};

export const EMAIL_TAKEN_MESSAGE = 'This email address is already in use.';

/** The role as shown to the user; the API value is an identifier, not display text. */
export const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Member',
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
};
