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

- Full managed run `1795641819691-d2479ef5` at `637d265`: 69 passed / 1 failed, exit 1,
  zero retries, cleanup completed. Both new drill-down scenarios passed. Existing guest-dashboard
  test used force-check on a hidden controlled radio and asserted a queryless reload URL.
  Replaced forced clicks with real keyboard arrow selection plus awaited checked-state assertions,
  and explicitly asserted retained activityTable/metric URL values after reload. No application
  behaviour, metric/count assertions, timeout, retry or quality gate was relaxed.

- Final scoped review found that a disabled invalid-filter query could still read a cached ordinary
  feed and expose its pagination (posts were already hidden). Added a failing cache-backed unit
  case, gated pagination on valid filters, then observed all 64 feed tests pass. This bounded
  correction remains inside PWDRZ-185's invalid-link/cache behaviour; final checks follow it.

- Full run `1795642073411-f1aaa97a` at `05a0729`: 70/70 passed, exit 0 and cleanup confirmed.
- Run `1795642268990-0cad6d98` at `ff3905e`: 69/70 passed; repeated real navigation exposed
  an intermittent departure-scroll race (Y difference 1415). A queued browser scroll event could
  arrive after the dashboard unmounted. Added three deterministic unit cases (keydown/pointer/click
  before queued scroll): all failed with stored Y=0 instead of 900, then passed after capturing
  position before link handlers/navigation. Scope/timeouts/retries/8px assertion are unchanged.
  Focused managed run `1795642607348-e7cf03e8` then passed both scenarios, exit 0 and cleanup.
  Test-only attachments now record the entry key/Y/position map to make failures diagnosable.
- At ff3905e, frontend coverage passed 1550 tests/134 files, all four gates; root check 10/10
  (6 cached), production build passed. These precede the final scroll-event correction; final
  implementation checks and CI are recorded below after completion.
