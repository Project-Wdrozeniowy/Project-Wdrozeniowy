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
- The first default-concurrency coverage run found a new unnamed props type (fixed) and an existing route test timeout; no timeout/assertion/gate was relaxed. Complete follow-up with `npm --prefix frontend run test:coverage -- --maxWorkers=2`: **1458/1458 tests, 129 files**, exit 0; statements 98.37%, branches 94.41%, functions 98.20%, lines 99.06%. Dashboard mapper/UI coverage: 100% on all four metrics. Production source corresponds to `464d6e0`.
- First E2E run `1795611964365-6149f57a`: new nonempty fixture exceeded the real category VARCHAR(100) limit. Corrected fixture to exactly 100 characters; empty-window and failed-transport/recovery scenarios passed. Run ended 65 passed / 1 failed, exit 1; cleanup completed.
- A diagnostic npm-exec command ran from the repository root rather than the frontend, so collected suites lacked their config. It is not verification evidence; the corrected frontend-directory command produced the 162/162 result above.
- Root `npm run check`: **10/10 tasks succeeded** (4 cached). Windows Nx daemon initially stalled; no-daemon plugins then hit socket-path length. Reran with process-local `NX_DAEMON=false`, `NX_ISOLATE_PLUGINS=false`, `NX_TUI=false`; no tracked configuration or gates changed. E2E typecheck/format and infrastructure tests 3/3 passed separately.
- Second E2E run `1795612245474-a20cc45d` found another setup error: CreatePostRequest requires categoryId, so creating uncategorized directly returned 400. Fixed the fixture to create through the real required contract and then model a historical null association inside the owned DB. The long category is also made unlisted after creation to verify its public-post counts remain visible. Run ended 65 passed / 1 failed, exit 1; cleanup completed. No application/backend fix was needed for either setup error.

- Focused managed run `1795612462038-501718f0`: 3/3 new browser scenarios passed, exit 0, cleanup confirmed. API-backed 7d/30d distribution, >8 rows, a 100-character unlisted category with public posts, null association, draft exclusion, keyboard table/retry, both themes at 320/390px and zero window all passed. Screenshots inspected; fixed shell overlays crossed tall element captures, so final captures hide only external header/nav during screenshot (layout assertions run without this style). Added a standard-category post for visible colour verification.

## Final verification and acceptance

Tested production/E2E revision: `e465b1b44e59a2c6ce0116a1b7dd4c87fa8caab1`, clean working tree
at final managed-run start. The subsequent completion commit changes execution documentation and
local tracking only. Node 24.15.0; npm 11.12.1 invoked through its bundled CLI (the shell default
resolves a different npm). No new dependencies, contracts, generated bindings, backend/schema,
gateway, launcher or CI configuration changes.

| Check                                       | Observed result                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend coverage                           | 1458 tests / 129 files; all four gates pass; dashboard mapper/UI all four metrics 100%                                                     |
| Root check on final feature/test commit     | 10/10 succeeded, 7 cached; process-local Nx settings as recorded above                                                                     |
| Frontend production build                   | Passed; pre-existing dependency annotation/chunk-size warnings retained                                                                    |
| API bindings                                | 102 files match validated contract                                                                                                         |
| E2E typecheck / formatting / infrastructure | Passed; infrastructure 3/3                                                                                                                 |
| Complete managed browser + HTTP integration | **66/66 passed**, zero retries, exit 0; run `1795612617194-eff3e4e9`                                                                       |
| Cleanup                                     | result.json exitCode 0; owned runtime absent; exact Compose project has no remaining containers or network; image/network cleanup recorded |
| Git hygiene                                 | No pre-existing staged changes; original 105 backlog entries preserved; no co-author trailers                                              |

Local evidence: `e2e/artifacts/1795612617194-eff3e4e9/{run.json,result.json,browser-tests.log,stack-cleanup.log,report/index.html}`.
Category response attachments and screenshots are in the report/test-results. Generated evidence
remains ignored, not committed. Local gates do not establish remote CI results; no PR was created.

### Concrete browser controls

Fixture setup creates three extra categories, including one 100-character category; published posts
in that category, a historical null association, a standard category, one ten-day-old post, and a
draft. The long category is made unlisted after post creation. API writes use the real session/CSRF;
historical/null/unlisted setup is restricted to the launcher's owned disposable database. The browser
remains a guest. Other synthetic history is preserved/restored if an empty-window setup requires it.

| Input / expectation                                                                                   | Observed                                                                                                                        |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 7d: current long-category post + standard-category post + uncategorized; exclude older post and draft | Total 3; 11 rows; three counts of 1 and shares 0.3333, shown as 33.33%; remaining rows zero                                     |
| Switch to 30d: include the ten-day-old long-category post                                             | Total 4; long category 2 (50%), other two groups 1 each (25%); table/graph agree with the actual response                       |
| Compare category rows and activity                                                                    | Row sum equals category total and real public activity total for both periods                                                   |
| Empty window                                                                                          | Real API returns total 0, row counts 0, shares null; UI says no public posts and table says Not applicable                      |
| Failed category transport                                                                             | Abort only the request, without a fabricated response; panel error, no chart; keyboard retry reads the real server successfully |
| Guest access / safe reads                                                                             | No own-analytics request; analytics requests are GET; synthetic posts' opening counters unchanged                               |
| Keyboard / responsive presentation                                                                    | Enter opens table; rows/counts/shares readable; actual page/card bounds fit 320/390px in light/dark themes                      |

Visual inspection: final `categories-light-desktop.png` and `categories-dark-320.png` inspected against
the selected card. Horizontal tracks, labels/counts, theme colours, long-name wrapping and complete
table render correctly. Extra period/total/update/empty/error/table UI implements the approved AC;
sample figures, static topic lists and a real-time claim are not copied from Figma.

### Targeted provisional-functionality review

Reviewed the current-ticket/branch keys, dashboard mapper/UI/tests, category query and the directly
related E2E scenario and ownership references. Retired the eight-bar/Other aggregation, old vertical
BarChart and obsolete assertions/helper; no artificial guards/stubs remained in this feature.
No unticketed TODO was resolved and no unrelated cleanup was performed.

PWDRZ-185 (Ruslan 82179) now has complete category rows and preserved category/null identities to
integrate. Its links, forum filters and analytics-context restoration remain its own scope, and
PWDRZ-174 (Dzmitry Varonin) retains its outstanding dashboard scope. This does not declare PWDRZ-185
fully unblocked. Independent response snapshots can still differ during concurrent activity.
Jira status/scope/links and Figma content remain unchanged; nobody was messaged.
