# Shared auth

This directory will own **global client session and token lifecycle**, which multiple routes and widgets need.

- Put the in-memory access token and cohesive session coordination here. Preserve the HttpOnly refresh-cookie flow through the shared API client.
- Do not put page-specific login form UI, authorization decisions owned by the backend, or a second independently editable profile cache here.
- Planned examples from current code: `lib/tokenMemory.ts` and the session portion of `store/slices/authSlice.ts`. Their current files have not been moved.

The profile/state consolidation belongs to [PWDRZ-150](https://project-wdrz.atlassian.net/browse/PWDRZ-150). See the [frontend architecture target](../../../../docs/guides/frontend/README.md).
