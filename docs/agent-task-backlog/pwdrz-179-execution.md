# PWDRZ-179 — dashboard category distribution

## Authorization and source

- User approved the technical plan and selected the presentation matching Figma; subsequently authorized implementation, local commits without co-author trailers, and creation/publication of the task branch.
- Base: `1fc9313cd25034d50fa4844cd12608e8d4f4c191`, identical to fetched `origin/develop` at execution start. Working tree/index were clean.
- Branch: `PWDRZ-179-category-distribution`, published at the base with upstream `origin/PWDRZ-179-category-distribution`.
- Live Jira rechecked at implementation start; scope unchanged. No Jira/Figma mutation or PR authorized/performed.
- Figma: `J2k3T1a2db6v51UckdUyEU`, frame `25:1715`, card `143:1931`. High-fidelity design context and screenshot inspected. Horizontal bars, labels, counts, rounded tracks; reuse existing semantic theme/category colours. No raster/SVG assets in this card.

## Reviewed context map

| Files                                                                                  | Responsibility / planned change                                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `frontend/src/pages/dashboard/ui/ChartsSection.tsx`                                    | Replace only category block; preserve daily activity and period ownership                  |
| `frontend/src/pages/dashboard/lib/dashboardView.ts`, `config/dashboard.const.ts`       | Preserve category identity/share, all rows, uncategorized; retire eight-bar/Other grouping |
| `ui/CategoryDistribution{Card,Chart,Table}.tsx`                                        | Screen-private presentation, metadata, semantic table, zero/load/error/refresh states      |
| `frontend/src/test/fakeAnalyticsServer.ts`                                             | Contract-faithful shares, windows and consistent totals                                    |
| Dashboard mapper/component/integration tests; `e2e/tests/dashboard-categories.spec.ts` | Values, periods, error recovery, identity, browser/real HTTP and narrow layouts            |
| `docs/guides/frontend/README.md`                                                       | Document category semantics and ownership                                                  |

Dependencies reused: generated analytics models/operation and existing hook, ApiClient,
QueryState/PanelError/RetryButton/ChartCard/ChartSkeleton, getCategoryDotColor.
Reference: ActivityChart/ActivityTable. No public API/schema/config/dependency changes planned.
PWDRZ-174 retains global dashboard work; PWDRZ-185 retains links, forum filters and history restoration.

## Test-first observations

- Mapper: before production changes, 5 new expectations failed against the old labels/values mapper (identity/share/all-rows/zero-width behaviour); 4 existing expectations passed. After implementation and faithful fixtures: 9/9 passed.
- Component/transport suite was authored before its new component. Initial collection failed because the component did not yet exist; this is NOT behavioural red-test evidence. Mapper failures above are behavioural red evidence. Additional component/integration checks follow below.

## Verification

- Focused mapper/component/page/sidebar run: 47/47 passed. Named-props/router/dashboard follow-up: 162/162 passed, including the previously timed-out dynamic route.
- Frontend typecheck, lint, format check, production build passed. API drift: 102 generated files match the validated contract.
- The first default-concurrency coverage run found a new unnamed props type (fixed) and an existing route test timeout; no timeout/assertion/gate was relaxed. A complete run with two workers is pending.
- First E2E run `1795611964365-6149f57a`: new nonempty fixture exceeded the real category VARCHAR(100) limit. Corrected fixture to exactly 100 characters; empty-window and failed-transport/recovery scenarios passed. Full completion/cleanup and rerun pending.
- A diagnostic npm-exec command ran from the repository root rather than the frontend, so collected suites lacked their config. It is not verification evidence; the corrected frontend-directory command produced the 162/162 result above.

Final gates and browser input/expected/observed evidence will be recorded after execution.
