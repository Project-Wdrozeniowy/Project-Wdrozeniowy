# Shared auth

This directory owns **global client session presentation and coordination** used by routes and widgets.

- `session.ts` coordinates `/users/me` bootstrap, explicit authentication, logout and tab reconciliation; `sessionEvents.ts` isolates stale work. Cookies/CSRF use the single shared API client.
- Do not put page-specific login form UI, authorization decisions owned by the backend, or a second independently editable profile cache here.
- No access/refresh tokens, persistent browser credentials, automatic mutation replay or heartbeat. See [session policy](../../../../docs/guides/sessions.md).

The signed-in user's profile lives only in the TanStack Query cache (`shared/api/profile/currentUser.ts`, [PWDRZ-150](https://project-wdrz.atlassian.net/browse/PWDRZ-150)): `session.ts` writes it when the server confirms a session, and the store (`authSlice`) holds only the session lifecycle. See the [frontend architecture target](../../../../docs/guides/frontend/README.md).
