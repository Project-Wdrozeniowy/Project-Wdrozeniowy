# Shared

This FSD layer holds **cross-feature infrastructure and reusable building blocks**. It must not import `features/`, `widgets/` or route code from `app/`.

- `api/` is the planned home for the HTTP client, API adapters, DTOs, TanStack Query keys/hooks and mutations.
- `auth/` is the planned home for in-memory token and global session lifecycle code, not a second independently managed user-profile cache.
- Generic UI and utilities may live in `ui/` and `lib/` when they have real consumers.

Examples from the current codebase are `src/services/api.ts`, `src/hooks/useForumPosts.ts` and `src/lib/tokenMemory.ts`; **these have not been moved here yet**. See the [frontend architecture target](../../../docs/guides/frontend/README.md).
