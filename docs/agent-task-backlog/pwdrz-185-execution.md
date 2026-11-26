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

## Intermediate verification

These entries preserve intermediate attempts; final acceptance is recorded below.

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

## Original acceptance (superseded by returned CI failure below)

Tested implementation: `30c6a0aad2f78e717274e5c6c01edb88d530f8e9`, clean working tree at final
gate start. Node 24.15.0, bundled npm 11.12.1 (shell default npm was not changed), Docker Engine
29.4.3. The completion commit updates only this record and PWDRZ-185 local tracking.
No backend, gateway, database schema, OpenAPI, generated binding, dependency, launcher or CI
configuration changes. No PR, Jira/Figma content update or message to another owner.

| Check                                 | Observed result                                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Frontend coverage                     | 1553/1553 tests, 134 files, exit 0; statements 98.38%, branches 94.59%, functions 98.19%, lines 99.05%; all gates pass |
| Root check                            | 10/10 tasks succeeded, 4 cached; typecheck, lint and formatting retain their configured gates                          |
| Frontend production build             | Passed; existing dependency-annotation/chunk-size warnings remain                                                      |
| API bindings                          | 102 generated files match the validated contract; no contract change                                                   |
| E2E tooling                           | Typecheck/format passed through root check; infrastructure 3/3 passed                                                  |
| Complete managed browser + HTTP suite | **70/70 passed**, zero retries, exit 0; run `1795642744065-98964270`                                                   |
| Cleanup                               | Runtime absent; exact final Compose project has no containers or network; owned images/network removal recorded        |
| GitHub CI                             | **10/10 jobs passed** across six manually dispatched workflows, all on the tested implementation SHA                   |

Local evidence: `e2e/artifacts/1795642744065-98964270/{run.json,result.json,browser-tests.log,stack-cleanup.log,report/index.html}`.
Final local command logs: root ignored `pwdrz185-final-{coverage,stack,source-check,source-build}.log`.
All previous owned run projects were also inspected after Docker became ready: no residual
containers, networks or runtime directories. Generated screenshots/reports/logs remain ignored.

### Concrete controls and observed behaviour

The fixture creates a dedicated category and 19 API-backed posts, then gives only its own rows
controlled historical timestamps/statuses/null association in the migrated disposable database.
The browser is a guest; authenticated API setup is a separate request context with real CSRF.

| Input / expected output                                                                        | Observed                                                                                                                                   |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Category row for the displayed 30d UTC window, using its returned ID and exact response bounds | Row and feed total 16; all returned posts have that category ID                                                                            |
| Page size 10, second page of that selection                                                    | Six remaining posts, no overlap with page one; dates/category retained                                                                     |
| Reload and copied second-page URL in another page                                              | Same filters, page 2 and total 16                                                                                                          |
| Back after feed reload                                                                         | 30d/posts, both tables open, exact source dashboard URL and Y position restored within the unchanged 8px assertion                         |
| Day `2026-11-23`, from `00:00:00Z` inclusive to `2026-11-24T00:00:00Z` exclusive               | Graph and table have identical destinations; feed total equals the day's API aggregate                                                     |
| Same day restricted to the controlled category                                                 | Exactly 13: twelve public posts including both UTC edges, plus one locked post; before/after/draft/deleted/null-category controls excluded |
| Delete one selected public post after reading analytics                                        | Reopening revalidates the cached selection and returns 15; current-visibility explanation stays visible                                    |
| No category row                                                                                | `uncategorized=true`, every returned post has null category and total matches the API row                                                  |
| Quiet category, then failed real feed transport and keyboard retry                             | Zero and truthful empty selection; fixed error; retry reads the actual server and recovers                                                 |
| Invalid date/category conflict                                                                 | Invalid-filter state, no feed request; clear action recovers. Cached ordinary pagination is also hidden (deterministic unit case)          |
| Both themes at 320/390px                                                                       | No document overflow; daily chart targets at least 24px; categories, table and filtered forum readable                                     |
| Read-only navigation                                                                           | Browser API calls are GET; no own-analytics call; fixture opening counters unchanged                                                       |

Visual QA inspected the dark 320px category table and filtered forum, including wrapped UTC bounds,
clear actions, category labels, zero values and normally wrapped "Not applicable" shares.
Keyboard link, toggle, retry and metric interactions are checked; this is not a claim of a complete
WCAG audit. Counts follow current public visibility and are not an immutable snapshot.

### GitHub CI evidence

| Workflow       | Result / run                                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend Build | [Build Frontend passed](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions/runs/45706173657)                                        |
| Gateway Build  | [Build Gateway passed](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions/runs/45706186650)                                         |
| Backend Build  | [Build Backend passed](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions/runs/45706198702)                                         |
| Lint           | [Frontend and gateway lint/format passed](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions/runs/45706208825)                      |
| Tests          | [All three service coverage jobs and Workspace Tooling passed](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions/runs/45706219103) |
| E2E            | [E2E (Chromium) passed](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions/runs/45706233260)                                        |

The branch's push does not automatically trigger these main/develop/PR workflows. Existing
workflow_dispatch was used; CI configuration and branch rules were not modified. These results
refer to the implementation SHA above, before the documentation-only completion commit.

### Targeted provisional-functionality review

Reviewed PWDRZ-185 and the matching task branch, affected dashboard/forum/chart/query source,
adjacent tests, E2E and relevant guide/instruction references. Updated the current-ticket
no-links/default-reload expectations and ownership markers together with implementation. All API
rows/IDs/null semantics and comment-only metric behaviour are preserved. No new feature flag,
stub, artificial guard or unsupported success fixture was introduced; no unticketed TODO resolved.
Historical execution records and unrelated owners' provisional features were preserved.
No additional downstream task was established as newly unblocked, and no owner was messaged.

Current limits: changed visibility/categories/new posts can change counts; offset pagination can
shift under concurrent writes; blocked session storage falls back to ordinary router restoration
and cannot guarantee persisted Y after a full reload. Dashboard URL settings remain shareable.

## Returned CI failure — 25 November 2026

User supplied the red PR E2E gate. Downloaded [run 45712807923](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions/runs/45712807923)
at `bb0ac58`, managed run `1795645492088-4c10d1b4`: 69 passed / 1 failed, zero retries,
exit 1, cleanup completed. The failure is again dashboard Back scroll, unchanged 8px assertion.
Trace attachments prove departure Y=1415 with no stored position, then returned Y=0 with
`{"default":0}` stored. Previous successful runs are retained above as history, not proof that
this returned failure was resolved.

Context map remains the approved dashboard hook, its adjacent unit test, and the drill-down E2E.
A deterministic regression test now mounts a router boundary which resets scroll in a layout
effect before the old screen's passive cleanup. It failed with restored 0 instead of 900.
Moving the dashboard hook's persistence/listener cleanup to the layout phase makes this test
pass before Router's new-route reset can overwrite the departure position (11/11 hook tests;
14/14 with the real-router journey suite). Capture-phase navigation input alone was insufficient.
Added three required keyboard/pointer round trips to the browser scenario; these are independent
asserted transitions, not test retries. No timeout, tolerance, assertion or quality gate is relaxed.
Final verification of the correction is in progress.

Focused managed run `1795646050004-be4153b0` passed 2/2 scenarios, zero retries, exit 0 and
cleanup completed. This includes the original reload/Back path plus all three added keyboard/pointer
round trips. Resuming on 26 November: the previous PR-read approval request was not executed due
to an approval-review usage limit; no approval check was bypassed. PR #126 targets develop.

### Integration with current develop — 26 November 2026

Correction commit `53875cb` reached the remote branch. GitHub reported PR #126 as conflicting,
so it created no checks for this head. Fetched develop `a641d58` (PWDRZ-166 and PWDRZ-175).
The only conflict is dashboard composition: preserve PWDRZ-175's top-posts-first order while
retaining PWDRZ-185's URL-owned settings and scroll hook. No new product decision or CI change.
The existing PWDRZ-175 section-order test covers the integrated composition.

Before integration, root check passed 10/10, frontend build passed, API bindings matched 102
files and E2E infrastructure passed 3/3. Full frontend coverage had 1553 passes / one timeout
in the unrelated dynamic-post router test (5s); this is not a passing gate. Full local E2E
run `1795687783800-72ba7f24` did not reach tests because Docker Desktop was stopped; both start
and cleanup reported the unavailable engine. Docker Desktop was then started successfully.
The combined source will be verified afresh without changing retries, assertions or timeouts.
