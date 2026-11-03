# Shared API

This directory owns the frontend's **single gateway-facing transport and server-cache boundary**.

- Put `ApiClient`, endpoint adapters, API DTOs, query keys, **all TanStack Query hooks and mutations**, and their tests here. Organize real consumers by API responsibility such as forum or profile.
- Do not create a second Axios client, call the backend directly, or move route UI and feature form state here. Preserve refresh-token, cookie and 401 handling when relocating the current client.
- `generated/` contains committed Orval models, operations and Query bindings. Do not edit it manually. Use generated operations/options directly; handwritten hooks retain only application behavior.
- `client/orvalTransport.ts` delegates to the existing ApiClient. `forum/useForumPosts.ts`, `forum/useVotePost.ts`, `profile/` and search compositions preserve filtering, cache and interaction behavior. Hidden `501` APIs remain explicitly provisional.

See the [generation and drift-check workflow](../../../../docs/guides/api-bindings.md).

TanStack Query is the canonical server cache; the overlapping profile in Zustand is separate [PWDRZ-150](https://project-wdrz.atlassian.net/browse/PWDRZ-150) work. See the [frontend architecture target](../../../../docs/guides/frontend/README.md).
