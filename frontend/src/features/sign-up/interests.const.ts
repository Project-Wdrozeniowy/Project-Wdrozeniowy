/**
 * PROVISIONAL (PWDRZ-154): registration interests are shown but unavailable.
 *
 * Dependency: the backend registration contract (`RegisterRequest` and `backend/openapi.json`)
 * has no `interests` field and nothing persists or uses them, so a selection would be silently
 * thrown away. It is owned by the backend/product side; there is no ticket for it yet.
 *
 * When the contract exists: make the tiles selectable again, keep the picked topics in the form
 * state and schema, and send them through `toRegisterRequest` under the agreed field name.
 */
export const INTERESTS_TITLE = 'Select Your Interests';
export const INTERESTS_LIST_LABEL = 'Topics, not available yet';
export const INTERESTS_UNAVAILABLE_BADGE = 'Coming soon';
export const INTERESTS_UNAVAILABLE_TEXT =
  'Choosing topics is not available yet. Nothing you pick would be saved, so your feed is not personalized during sign-up.';
