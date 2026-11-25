# PWDRZ-185 — analytics publication drill-down

## Authorization and base

User approved the detailed plan in this chat, including local commits without trailers and
publication of the task branch/upstream. Base `f58ea58c4b4762d1c13dbaeeb67334af55c49233`
matched fetched `origin/develop`; working tree and index were clean. Branch
`PWDRZ-185-analytics-publication-drilldown` was created and published at this base.
Live Jira scope rechecked: PWDRZ-174 Done, PWDRZ-179/PWDRZ-184 In testing;
required contracts and components are present. No Jira or Figma content is changed.

## Approved plan and context map

1. Share pure URL builders/parsing/clearing in `features/publication-drilldown`.
2. Extend existing forum query, cache isolation, filter labels/clearing, empty/error handling.
3. Link daily post buckets and category rows in graphs and semantic tables; comments remain text.
4. Keep period, metric and table disclosure in dashboard URL; verify history/reload/scroll.
5. Add meaningful unit/transport/router/browser checks and run unchanged quality gates.
6. Update guides, targeted provisional markers and local tracking from observed evidence.

| Files                                                                              | Responsibility                                                         |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `features/publication-drilldown/*`                                                 | Exact UTC windows, category IDs/null, validated URL and clearing       |
| `shared/api/forum/useForumPosts.ts`                                                | Generated request, enabled state, placeholder isolation                |
| `pages/forum/ui/{ForumFeed,CategoryFilter,EmptyFeed,ActivePublicationFilters}.tsx` | Visible filters, conflicts, errors, labels, pagination                 |
| `pages/dashboard/ui/{DashboardPage,ChartsSection,CategoryDistribution*}.tsx`       | Links and URL-owned context                                            |
| `widgets/activity-chart/ui/{ActivityChart,ActivityGraph,ActivityTable}.tsx`        | Optional accessible actions; preserve author chart                     |
| Adjacent unit/integration tests, managed E2E                                       | Input/output, keyboard, themes/narrow layouts, Back/reload, visibility |

Reuse generated DTOs/operations, ApiClient, Query feedback, existing router/scroll handling,
activity/category chart presentation. No backend/API/schema/configuration/dependency changes planned.
API bounds are inclusive/exclusive creation times under current public visibility, not a snapshot.
Category names are display metadata; only stable ID/uncategorized determines the query.

## Test-first observations

- Pure URL behaviour: 33/33 tests failed against a minimal temporary module, then 33/33 passed.
- Four new forum transport/UI expectations failed against the original feed (no filters,
  no invalid-link state, no truthful empty selection). After implementation, focused feed/helper
  suite 101/101 passed. Existing mocked network results are contract tests, not real-stack evidence.
- An initial command used root vitest path; dependency is workspace-local. Corrected command ran
  from `frontend` with its config. That command error is not behavioural red evidence.

## Verification

Implementation and final acceptance checks are in progress. No completion claim yet.

- Focused helper/forum/dashboard/activity suite: 240/240 passed. Two new chart unit expectations
  failed before implementation; actual-router journey expectations also failed before wiring.
  Old image-role and keyboard-order assertions were updated for real accessible links, retaining
  count/table assertions. The journey fixture initially used incorrect 30d labels/radio selectors;
  corrected against existing period-button and response contracts, without changing production.
- Frontend typecheck/lint/build passed; API drift: 102 generated files match. Root check 10/10
  tasks succeeded (4 cached), process-local `NX_DAEMON=false`, `NX_ISOLATE_PLUGINS=false`, `NX_TUI=false`.
- First two managed run attempts (`1795641000973-3c1c19ae`, `1795641118970-3331275b`) could not
  start Docker Engine; no browser tests ran. Runtime directories were removed, but Compose cleanup
  could not connect either. Docker Desktop was launched directly, then Engine 29.4.3 became ready.
  Subsequent real-stack results are recorded below when observed.

- Real run `1795641189230-5567b1a8`: zero/invalid/retry/themes/narrow scenario passed; main
  fixture failed SQL setup because subtraction needed an explicit timestamptz cast. Fixed setup.
- Run `1795641268792-268a9db8`: exposed real Back-after-reload scroll clamping (872px from the
  expected position). Added screen-local, entry-keyed bounded restoration with user-input release;
  observed failing unit timeout expectation before implementation; 7/7 hook tests then passed.
- Run `1795641475195-430d6214`: scroll passed, then reopening the category selection revealed that
  the application's 60s query freshness window suppressed a current-visibility revalidation.
  Added a unit case using that same freshness default: it failed (one request instead of two),
  then passed with zero stale time specifically for analytics selections. Ordinary feed policy stays.
- Run `1795641675334-67ea5a4b`: main journey passed, including category count 16, daily category
  count 13, pagination, shared/reloaded URL, restored scroll/settings, then count 15 after deletion.
  Second scenario's invalid-link request collector included the preceding clear-category request;
  fixed synchronization to await that valid request before observing invalid navigation.
  All three runs exited 1 and completed managed cleanup; they are diagnostic, not final acceptance.
- Visual QA found the existing narrow table splitting "Not applicable" inside a word; adjusted
  the category/count/share widths and kept the share label's normal word wrapping. No metric or
  count changed. Added a 320px filtered-forum screenshot/overflow assertion.
- Local commits: `4bdbaec` (URL filters/forum), `99fd814` (analytics actions/context/cache follow-up).
  The second full frontend run passed 1548 tests/134 files before the final cache-revalidation
  case; final full coverage and managed E2E must be rerun on the completed implementation.
