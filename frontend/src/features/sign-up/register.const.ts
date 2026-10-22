export const REGISTER_ERROR_MESSAGE = 'Registration failed. Please try again.';

/** The fields the API can reject, as named in its request, in the order of the form. */
export const REGISTER_FIELDS = ['username', 'displayName', 'email', 'password'] as const;
export type RegisterField = (typeof REGISTER_FIELDS)[number];

/**
 * One wording per rule, in the words of the form. The server's own validation text is never
 * shown (it is not written for end users).
 */
export const REGISTER_FIELD_ERRORS = {
  invalid: {
    username: 'Username must be 3 to 50 characters',
    email: 'Please enter a valid email address',
    password: 'Password must be 8 to 128 characters',
    displayName: 'Display name must be at most 100 characters and not blank',
  } satisfies Record<RegisterField, string>,
  usernameTaken: 'This username is already taken',
  emailTaken: 'This email address is already registered',
} as const;
