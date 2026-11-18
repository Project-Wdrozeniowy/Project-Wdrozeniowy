/** Limits of `POST /users/me/password`; they match the backend validation. */
export const NEW_PASSWORD_MIN_LENGTH = 8;
export const NEW_PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_FIELDS = ['currentPassword', 'newPassword'] as const;
export type PasswordField = (typeof PASSWORD_FIELDS)[number];

export const PASSWORD_CHANGE_ERROR_MESSAGE = 'We could not change your password. Please try again.';
export const PASSWORD_CHANGED_MESSAGE = 'Password changed. Please sign in again.';

/** What the user is told before the change, because it ends every session. */
export const PASSWORD_CONFIRM_TITLE = 'Change your password and sign out?';
export const PASSWORD_CONFIRM_TEXT =
  'Changing your password signs you out on all devices, including this one. You will need to sign in again with the new password.';

/** One wording per rule, used by the form validation and the mapping of server errors. */
export const PASSWORD_FIELD_ERRORS = {
  currentRequired: 'Enter your current password',
  currentIncorrect: 'Your current password is incorrect',
  newRequired: 'Enter a new password',
  newRejected: `This password is not accepted. Use ${NEW_PASSWORD_MIN_LENGTH} to ${NEW_PASSWORD_MAX_LENGTH} characters.`,
  newTooShort: `Password must be at least ${NEW_PASSWORD_MIN_LENGTH} characters`,
  newTooLong: `Password must be at most ${NEW_PASSWORD_MAX_LENGTH} characters`,
  confirmRequired: 'Repeat the new password',
  confirmMismatch: 'Passwords do not match',
} as const;
