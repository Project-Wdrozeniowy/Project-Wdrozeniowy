export const SIGN_IN_FAILED_MESSAGE = 'Sign in failed. Please try again.';
export const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password';

/**
 * PROVISIONAL: password recovery is not available. The backend has no recovery contract (no reset
 * endpoint, no email delivery), so the "Forgot password?" link that ended on a 404 page is gone and
 * the form says so. It is a new authentication flow, owned by the backend/product side; there is no
 * ticket for it yet. When it exists: add the page and the link back, and drop this hint.
 */
export const PASSWORD_RECOVERY_UNAVAILABLE_TEXT = 'Password recovery is not available yet.';
