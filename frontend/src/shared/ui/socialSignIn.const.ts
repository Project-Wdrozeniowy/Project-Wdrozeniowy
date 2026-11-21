/**
 * PROVISIONAL: signing in with Google, GitHub or Discord is shown but unavailable.
 *
 * Dependency: the backend has no OAuth/social sign-in contract (`backend/openapi.json` lists only
 * `/auth/login`, `/auth/register`, `/auth/logout` and `/auth/csrf`). It is a new authentication
 * protocol, owned by the backend/product side; there is no ticket for it yet.
 *
 * When the contract exists: turn the tiles back into links or buttons that start the provider's
 * flow, and give the outcome (success, cancelled, failed) a visible state.
 */
export const SOCIAL_PROVIDERS = ['Google', 'GitHub', 'Discord'] as const;
export const SOCIAL_DIVIDER_TEXT = 'Or continue with';
export const SOCIAL_LIST_LABEL = 'Social sign-in providers, not available yet';
export const SOCIAL_UNAVAILABLE_BADGE = 'Coming soon';
export const SOCIAL_UNAVAILABLE_TEXT =
  'Signing in with Google, GitHub or Discord is not available yet. Use the form above.';
