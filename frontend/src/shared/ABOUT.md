# Shared

This FSD layer holds **cross-feature infrastructure and reusable building blocks**. It must not import `features/`, `widgets/` or route code from `app/`.

- `api/` is the planned home for the HTTP client, API adapters, DTOs, TanStack Query keys/hooks and mutations.
- `auth/` owns global session presentation and coordination, not a second independently managed user-profile cache.
- Generic UI and utilities may live in `ui/` and `lib/` when they have real consumers.

Current examples are `api/client/api.ts`, `api/forum/useForumPosts.ts` and `auth/session.ts`. See the [frontend architecture target](../../../docs/guides/frontend/README.md).
