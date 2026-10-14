# Widgets

This FSD layer owns **substantial, reusable page regions** assembled from lower layers. A widget may use `features/` and `shared/`, but must not import another widget or route-private code from `app/`.

- Put a region here when it has a stable responsibility across pages or layouts.
- Do not move a component here only because it is large; one route's feed or dashboard chart can stay route-local in `app/**/_ui/`.
- Planned Orbita examples: the site header and site sidebar. Their current components still live under `src/components/layout/` until migration.

Create only slices that have actual implementation. See the [frontend architecture target](../../../docs/guides/frontend/README.md).
