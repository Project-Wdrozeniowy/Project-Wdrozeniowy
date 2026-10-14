# Shared API

This directory will own the frontend's **single gateway-facing transport and server-cache boundary**.

- Put `ApiClient`, endpoint adapters, API DTOs, query keys, **all TanStack Query hooks and mutations**, and their tests here. Organize real consumers by API responsibility such as forum or profile.
- Do not create a second Axios client, call the backend directly, or move route UI and feature form state here. Preserve refresh-token, cookie and 401 handling when relocating the current client.
- Planned examples: `services/forumService.ts`, `hooks/useForumPosts.ts` and `hooks/useMyProfile.ts`. They remain at their current paths until migration.

TanStack Query is the canonical server cache; the overlapping profile in Zustand is separate [PWDRZ-150](https://project-wdrz.atlassian.net/browse/PWDRZ-150) work. See the [frontend architecture target](../../../../docs/guides/frontend/README.md).
