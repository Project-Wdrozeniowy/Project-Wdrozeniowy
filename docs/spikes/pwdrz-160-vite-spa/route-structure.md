# PWDRZ-160 route structure follow-up

> Historical record for the revisions named below. Adoption and REST authentication
> changed afterward. Use the [current handoff](README.md) for operating guidance.
> Original measurements and results below are preserved.

Status: implemented and locally verified. User explicitly requested FSD / React Router organization
inside the existing experimental branch after the runnable migration spike.
Reference revision before this follow-up: `d0d230399357284eb4ab32fee7227d29a4eff989`.
The earlier decision to retain Next-shaped folders is superseded for this branch
by this request. HTTP URLs, page behavior, Query/auth, gateway and backend stay
within the already verified experiment boundary.

## Context map

Reviewed against actual imports, route/guard/provider/component tests and the
installed React Router 7.18.5 API before implementation.

### Files to modify

| Current files                                        | Purpose                                      | Change                                                                                                   |
| ---------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| src/main.tsx, app/routes.tsx                         | browser bootstrap and route tree             | App entry plus app/router/{router.ts,routes.tsx}; explicit nested/layout/index routes                    |
| app/layout.tsx, (auth)/layout, (main)/layout         | providers and page frames                    | named RootLayout/AuthLayout/MainLayout under app/layouts; separate route error boundary                  |
| app/\_guards, protected/admin layout wrappers        | initialized session and role boundary        | app/router/guards; compose pathless guard routes directly, removing redundant wrappers                   |
| app/\_providers, configureValidation, globals.css    | application infrastructure                   | app/providers, app/config and app/styles                                                                 |
| app/(auth) and app/(main) page files/private modules | ten implemented screens                      | pages/{login,register,home,forum,post,search,dashboard,profile,settings,admin}/{ui,lib,config} as needed |
| app/(main)/\_ui and \_lib common post modules        | reused home/forum card/feed presentation     | one cohesive widgets/post-feed slice, with a small explicit public entry                                 |
| profile/ProfileLoadError consumed by settings        | pure presentation for the same profile error | shared/ui; no page-to-page dependency                                                                    |

### Dependencies

| Consumers                             | Relationship                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| app/router                            | consumes only public page entries, layouts and app-owned guards                         |
| home/forum pages                      | consume the shared post-feed widget; own their different query/navigation composition   |
| page-private UI/lib/config            | remain in the owning page slice; no cross-page imports                                  |
| existing features and shared API/auth | behavior and payloads retained; no store/contract redesign                              |
| module imports/mocks                  | move with files and resolve through @/ aliases; no transitional aliases to old folders  |
| documentation and execution records   | describe the current SPA structure; historical Next snapshot remains at the pinned base |

### Test files

| Tests                                          | Coverage                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| actual routes integration test                 | direct public/protected/admin/dynamic/error routes and redirects                           |
| guards/providers and session-bootstrap tests   | unchanged initialization/refresh/session behavior; integration tests belong in app         |
| auth composition / page-form integration tests | pages assemble existing features rather than owning submission logic                       |
| moved page/widget tests                        | original rendered behavior and query navigation preserved                                  |
| source dependency rule tests                   | new page/widget boundaries, no upward or same-layer slice coupling, curated public entries |
| managed real-stack E2E                         | all 16 existing cases through Express-served build and actual Spring/PostgreSQL            |

### Reference patterns

- Existing features/shared API ownership and PascalCase component / role-suffix naming.
- Existing Data Router RouteObject + Outlet + lazy component adaptation.
- Existing adjacent **tests**, root alias and strict service coverage scope.
- A public entry is added only for a real new page/widget boundary. No global
  pages barrel, export-star surface, empty layer or general entities migration.

### Risk assessment

- Public HTTP API changes: none.
- Database migrations: none.
- Configuration changes: internal frontend composition/import paths only.
- Main risks: missed mocks/relative imports, eager loading through public
  entries, page-to-page dependencies, moved source omitted from tests/coverage.
- Verification: root check, frontend coverage/build, module dependency checks,
  all managed production E2E cases; unchanged gates and no retries.

## Rationale and official sources

The App layer composes routing/providers; page slices own individual screens.
Related modules reused by home and forum need a lower shared owner. The
post-feed widget already combines voting features and post presentation, so
it has a concrete responsibility. ProfileLoadError is presentation-only and
can remain a business-themed shared UI component. These placements are project
choices derived from the import graph, rather than a required framework tree.

- [FSD layers and import direction](https://feature-sliced.design/docs/reference/layers)
- [FSD public APIs](https://feature-sliced.design/docs/reference/public-api)
- [React Router 7.18.5 data routing and Outlet layouts](https://reactrouter.com/7.18.5/start/data/routing)
- [React Router 7.18.5 lazy route properties](https://reactrouter.com/7.18.5/start/data/route-object#lazy)

Data remains in the current Query/Orval transport. There is no adoption of
React Router Framework Mode, automatic filesystem routing, loaders/actions,
SSR or changed authorization. No Jira edit, push, PR or merge belongs to this
follow-up authorization.

## Implemented result and verification

- Ten page slices expose named page components through small public entries.
  React Router configuration is in `app/router/routes.tsx`; browser-router
  creation is separate from the reusable route tree used by integration tests.
- Three layouts retain the same provider and visual frames. Auth and ADMIN
  checks are pathless route groups; redundant wrapper-only layouts were removed.
- Home/forum reuse `widgets/post-feed`. Their different query and navigation
  composition remains page-owned. Pure profile error UI is shared with settings.
- Integration tests that assemble pages, features and providers moved into App;
  tests for page/widget internals remain adjacent to their modules.
- Root `check`: all 10 targets passed. Root `build`: all 6 targets passed.
  Final `frontend:verified`: all 8 targets passed, including uncached coverage,
  codegen tests and API drift check. The frontend suite has 705 passing tests
  (701 retained plus four dependency-boundary tests); coverage gates are unchanged.
- E2E and full-stack `validate` were **not rerun after this follow-up**, per the
  user's explicit instruction to skip E2E. Earlier real-stack acceptance remains
  historical evidence for the initial migration, not proof of this new revision.
  No current backend/browser integration result is claimed.
- Local logs: shared ignored `evidence/route-structure/{check,build,frontend-final,
frontend-coverage}.log`. The accepted local source revision is recorded in
  `verification.json` under `routeStructureFollowUp`.
- Backend, gateway, E2E, dependencies/lockfile, Nx/CI configuration and generated
  API bindings have no changes in this follow-up. Original develop and baseline
  remain isolated from the experimental source changes.

Targeted provisional review covered the current key, route/guard/provider code,
page slices and adjacent post-feed modules. The post-detail body, disabled feed
detail/share/save actions and dashboard/live sample data remain their existing
product work. The misleading feed-action comment was narrowed to the behavior
that is actually still provisional; comments API availability was not changed.
No marker enables another ticket on completion of this folder reorganization.
Legacy store/utils ownership remains outside this bounded routing follow-up.
