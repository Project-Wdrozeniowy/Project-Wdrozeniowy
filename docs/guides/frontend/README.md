# Frontend architecture

The adopted Vite/React Router SPA uses the ownership map below. Start at the
[root README](../../../README.md), [frontend runbook](../../../frontend/README.md)
and [session policy](../sessions.md). The [PWDRZ-160 history](../../spikes/pwdrz-160-vite-spa/README.md)
preserves the original comparison and route-organization evidence.

## Ownership

| Location                                       | Responsibility                                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/main.tsx`                                 | Configure CSP-compatible validation, import global styles and mount App                |
| `app/App.tsx`                                  | Render RouterProvider with the browser router                                          |
| `app/router/router.ts`                         | Create one browser router outside component rendering                                  |
| `app/router/routes.tsx`                        | URL matching, lazy page imports and nested layout/guard composition                    |
| `app/router/RouteErrorBoundary.tsx`            | Global navigation/not-found error UI                                                   |
| `app/router/guards/`                           | Existing UI session/role guards and session loader                                     |
| `app/layouts/`                                 | Root provider/scroll/focus composition, auth frame, header/sidebar frame               |
| `app/providers/`, `app/config/`, `app/styles/` | Application-wide providers, validation setup and CSS                                   |
| `pages/<screen>/`                              | Screen composition and screen-private UI, helpers and display constants                |
| `widgets/post-feed/`                           | Reused post cards, view mapping and feed error/loading presentation                    |
| `widgets/header/`, `widgets/sidebar/`          | Existing reusable site regions                                                         |
| `features/`                                    | Existing sign-in/up, profile/password editing, publishing, comments and voting actions |
| `shared/api/`, `shared/auth/`                  | Existing API/Query/Orval and memory-token/session infrastructure                       |
| `shared/ui/`                                   | Reusable presentation, including the profile-load error used by profile and settings   |

Page slices are home, forum, post, search, login, register, dashboard, profile,
settings and admin. The post body remains a placeholder. Screen-specific code
stays in its page; dashboard charts and a page's feed are not promoted to widgets
just because they are large. The shared post-feed presentation is genuinely
consumed by both home and forum.

```text
src/
  main.tsx
  app/
    App.tsx
    config/configureValidation.ts
    layouts/{RootLayout,AuthLayout,MainLayout}.tsx
    providers/
    router/
      router.ts
      routes.tsx
      RouteErrorBoundary.tsx
      guards/
      __tests__/
    styles/globals.css
  pages/
    home/
      index.ts
      ui/{HomePage,HomeFeed}.tsx
      config/homeFeed.const.ts
    forum/
      index.ts
      ui/
      lib/
    post/
      index.ts
      ui/PostPage.tsx
    ... other implemented screens
  widgets/
    post-feed/
      index.ts
      ui/
      lib/
      config/
    header/
    sidebar/
  features/
  shared/
  store/   # existing state ownership, not reorganized here
  utils/   # existing compatibility utilities, not reorganized here
  test/
```

Only segments with real code are created. No new entities/processes layer,
empty folder scaffold, generic base page or route-generation mechanism is added.
Existing store/profile overlap remains PWDRZ-150's responsibility.

## Routing

React Router **7.18.5 Data Mode** uses explicit RouteObject configuration. The
router is not configured by filenames. The former `(auth)`, `(main)`,
`(protected)`, `[slug]`, `_ui`, `_lib`, `page.tsx` and `layout.tsx` structure has
been removed from source. Components use the project's PascalCase filenames.

The root `/` route composes RootLayout. Pathless AuthLayout/MainLayout routes
select the frame without adding URL segments. The home page is an index route;
`forum/:slug` is a dynamic segment. Pathless AuthGuard and ADMIN RoleGuard
routes use Outlet directly, replacing two redundant wrapper-only layouts.
All ten existing URLs and their redirect/initialization semantics are retained.

Each page loads through its own public entry, for example:

```tsx
{
  path: 'forum',
  lazy: async () => ({ Component: (await import('@/pages/forum')).ForumPage }),
}
```

The exported routes are also consumed by createMemoryRouter in integration
tests. Test code does not import the live browser-router singleton. There is
no React Router Framework Mode plugin, automatic filesystem routing or server
rendering. Loaders/actions are not introduced: TanStack Query and the existing
Orval transport continue to own server-cache access and mutation behavior.

RootLayout keeps the current Query/Auth/Toast providers, scroll restoration
and path-change focus behavior. Providers are not recreated per page. Query-only
navigation keeps filter/pagination focus. The global route error boundary
retains the existing not-found and failure UI. API authorization remains in
Spring; Spring owns JDBC sessions and CSRF; Express transparently forwards HTTP (PWDRZ-99).

## Imports and public entries

Production dependencies flow `app → pages → widgets → features → shared`;
layers may be skipped. Page, widget and feature slices do not import peers on
the same layer. App and Shared are not partitioned into business slices.

Every new page slice has one small `index.ts` exporting its page component.
The new post-feed slice exposes only its supported components, view-data type
and mapper. These entries provide a concrete stable contract for router/page
consumers; they are not global barrels or a requirement to wrap every existing
feature in an index. Internal modules import their own concrete files, never
their own public barrel. No export-star surface or aggregate `pages/index.ts`
is introduced, so route lazy loading remains separated by page.

Existing feature/shared public files retain their explicit import conventions.
Use `@/` for cross-module imports and relative paths within the same directory.
Keep API DTO, constant, schema and extracted type suffixes from the naming guide.
No transitional aliases or forwarding files point to the removed Next folders.

Pure ProfileLoadError presentation moved to shared UI because both profile and
settings consume it. Settings does not depend on the profile page. Business
requests and cache/session ownership were not moved into the error component.

## Tests and scope

Tests move with their UI/helper modules. Page/form and session/provider
integration tests live under app/router or app/providers, where assembling the
participating layers is intentional. Existing behavioral assertions and all
service coverage thresholds remain. New source-boundary checks cover downward
imports, peer-slice isolation, public page/widget integration and self-barrel
cycles. They do not claim that existing store/utils have been redesigned.

Run root check, frontend coverage/build and managed real-stack E2E after a
routing refactor. Never replace actual backend/browser acceptance with mocked
planned feature success. Product placeholders and their owners stay unchanged.

## References

The concrete tree is a project choice following
[FSD layer responsibilities/import direction](https://feature-sliced.design/docs/reference/layers),
[FSD public API boundaries](https://feature-sliced.design/docs/reference/public-api),
and the installed version's
[React Router data routing](https://reactrouter.com/7.18.5/start/data/routing) and
[lazy route properties](https://reactrouter.com/7.18.5/start/data/route-object#lazy).
