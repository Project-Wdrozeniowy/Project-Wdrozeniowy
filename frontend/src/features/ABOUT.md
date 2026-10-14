# Features

This FSD layer owns **user actions with a cohesive, reusable UI and behaviour boundary**. A feature may use `shared/`, but must not import another feature or a route from `app/`.

- Put an action's UI and genuinely feature-owned client logic here. Keep its tests beside the implementation.
- Do not put every page fragment, generic button, API client, server-cache hook or DTO here. TanStack Query operations belong in `shared/api/`.
- Planned examples from Orbita: post interactions (`ActionButton` and `VoteButton` together with their interaction boundary), comment actions, and profile editing. Their current locations remain unchanged until migration.

Create a slice only when there is real code and one clear responsibility. See the [frontend architecture target](../../../docs/guides/frontend/README.md).
