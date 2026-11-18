# PWDRZ-130 execution record

Date: 2026-11-02. Base: `develop` / `5b6020014fc474aafba12229efb7e14220763edc`.
Branch: `PWDRZ-130-generated-api-bindings`. The user authorized a logical commit
series without co-author trailers and subsequently authorized restoring `develop`
and publishing the task branch. PR #68 is open. The review follow-up authorizes
one local fix commit; further push, merge and Jira mutations are not requested.

## Decisions and scope

- Approved Orval + TanStack Query; pinned Orval 8.46.0 with Query v5.
- Generated output committed; mandatory read-only drift check.
- Approved-plan defaults: generated key factories with user-scoped profile;
  exact generated-directory exclusion from ESLint and percentage coverage.
  Handwritten code retains all service thresholds.
- Existing ApiClient, in-memory bearer and HttpOnly refresh cookie remain.
- Backend bearer metadata fix is in scope: original contract reproducibly failed
  strict validation; no frontend spec transformer or disabled validation is used.

## Implementation / review map

| Area          | Result                                                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Backend       | Removed apiKey-only bearer name; added source regression; regenerated published OpenAPI                                                   |
| Generation    | Local versioned input, 44 generated files for 23 operations, deterministic formatting, full-set drift comparison                          |
| Transport     | One typed request entry and custom mutator; cancellation, unknown errors, empty 204 normalization                                         |
| Auth          | Generated login/register/logout/profile operations; pending-token orchestration moved to shared/auth with PWDRZ-155 regressions retained  |
| Forum/search  | Generated operations/options; publish composition preserves callback lifecycle; meaningful feed/search/vote composition retained          |
| Profile       | Generated requests and user-scoped cache key; old Query/Zustand synchronization deliberately retained for PWDRZ-150                       |
| Cleanup       | Removed implemented service wrappers, duplicate DTOs and simple categories/create/password hooks; no compatibility barrels                |
| Nx/CI         | Noncached check before frontend typecheck/coverage/E2E; codegen regression before coverage; contract build input and workflow path filter |
| Documentation | API workflow, exceptions, coverage rationale, architecture and entry-point updates                                                        |

Generated signatures cover the entire published input, including currently unused
subscription/admin operations. No new UI or hidden `501` API was implemented.
Gateway error envelopes are not described by backend OpenAPI and remain unknown
until narrowed. Low-level single-flight refresh uses the generated response DTO
without importing generated runtime operations into the transport.

## Verification evidence

Local logs are ignored under `.workspace-artifacts/pwdrz130-*.log`; reports and
private machine diagnostics must not be added to Git.

| Check                         | Result                                                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend contract regeneration | 3 tests passed using an owned temporary PostgreSQL                                                                                                 |
| Backend full verify           | 188 tests, zero failures/errors/skips; coverage gates passed; owned DB removed                                                                     |
| Frontend coverage             | 67 files / 693 tests passed; statements 90.47%, branches 89.68%, functions 85.07%, lines 90.29%                                                    |
| Gateway coverage              | 7 suites / 51 tests passed; statements 97.03%, branches 86.95%, functions 92.30%, lines 96.99%                                                     |
| Root check                    | Passed frontend/gateway/E2E static checks and tooling format, with noncached API check                                                             |
| Root builds                   | Frontend/gateway/backend passed; frontend production URL explicitly supplied                                                                       |
| Workspace/E2E tooling         | Both infra-test targets passed                                                                                                                     |
| Codegen regression            | Clean deterministic generation; rejects altered/missing/extra output, changed input and invalid bearer metadata; preserves output on input failure |
| Real E2E                      | 8/8 passed on the isolated real stack; run 1793622381702-076d81e7, Chromium, one worker, no retries; teardown confirmed                            |
| Fresh install regeneration    | Passed root npm ci for frontend/root tools in a clean fixture on D:, then check → generate → check; no secrets/backend server required             |

The generated transport integration tests exercise actual generated operations
through ApiClient with a mocked HTTP boundary: URL/payload/credentials, optional
bearer on public reads, path encoding, concurrent 401 single-flight, AbortSignal,
unknown gateway failures and empty 204. Query tests preserve personal-data cache
isolation and prohibit Query retries after terminal auth failure. UI fixtures now
stop at the mutator; generated hooks/options/key factories remain real.

## E2E environment incident

Run `1793619694491-7532d52a` installed a clean frontend snapshot but Docker Engine
failed during gateway image build. No browser scenario ran. The cleanup command
also failed because the Engine was unavailable; its owned resources were checked
and cleaned up after recovery. Do not count this run as E2E success.

At 12:43:12 Europe/Warsaw, Docker VM logs report write I/O errors on its data disk,
an aborted ext4 journal, read-only remount and dockerd SIGBUS. The data VHD is on C:;
free host space was low during diagnosis. The underlying I/O cause is unconfirmed.
No Docker/WSL resource settings, filesystem repair, factory reset or global prune
were performed. User approved stopping Docker Desktop/its WSL, an offline VHDX
backup to D: and one restart. Recovery evidence is recorded separately in ignored
local artifacts; successful real E2E verification is recorded below.

Offline copies of both Docker VHDX files were completed on D: with matching SHA-256
after stopping Docker and detaching its data VHD. One restart then failed on the
host `dockerInference` runtime reparse-point (Windows error 1920). User-approved
rename of that socket failed with EACCES and did not change it; Docker was not
restarted after that failure. A proposed reversible replacement of the containing
runtime directory was proposed separately, then cancelled once Engine recovered. No images/volumes or disk
contents have been deleted as a recovery operation.

Engine later became ready (29.4.3) without renaming the runtime directory. A minimal
owned create/run/remove storage probe passed. The only image left by the failed
E2E project was removed by its exact name. The complete E2E retry passed all eight
scenarios, including cast/switch/retract and personal vote after reload. Sequential
Compose build and npm cache on D: reduced concurrent load/system-drive writes; no
other heavy checks ran alongside the retry. Engine readiness, absence of owned
containers/images and removal of the runtime snapshot were checked after teardown.
The original storage I/O cause remains unconfirmed; pre-existing Docker volumes
have not all been integrity-tested. Verified VHD backups remain in ignored local
artifacts on D:. No factory reset, global prune or filesystem repair was performed.

## Targeted provisional review

Resolved `TODO(PWDRZ-130)` in pagination: implemented pages use generated types;
provisional generic pages derive their envelope from the generated page schema.
Category writes PWDRZ-141, comments PWDRZ-142/67, tags PWDRZ-143/107, notifications
PWDRZ-144/152, analytics/recommendations/AI PWDRZ-145/146/147 and WebSocket PWDRZ-104
retain their ownership/prerequisites. Their mocked fixtures are not live contract
proof. PWDRZ-150 consolidation and PWDRZ-137 ruleset/affected-CI work are not absorbed.
No other task is claimed unblocked solely by generating bindings.

## PR preparation

Suggested title: `[PWDRZ-130]: Generate frontend API bindings from verified OpenAPI`.
Target: `develop`. Review backend metadata/contract first, then generator/transport,
cache/auth migration, remaining compositions and tests. Generated model/import
changes are mechanical; the generated source must match `npm run api:check`.
Initial verification was local. Independent review of PR #68 at `d8524ea` confirmed
green GitHub build/lint/service-test jobs, but E2E failed before browser execution
because its install omitted frontend codegen dependencies. The follow-up below
records the fix and its verification. The bounded backend metadata change should
receive backend review in the PR.

## Acceptance criteria and final diff review

| Criterion                                      | Evidence                                                                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Reproducible clean generation                  | Independent npm ci fixture, check/generate/check and byte comparison of all 44 files                                                   |
| Only usable contract; no manual output patches | Backend availability test, strict Orval validation, hidden 501 inventory, passing full-output check                                    |
| Auth/cookie/401 and forum behavior             | Generated transport tests, terminal-401 Query policy, real registration/login/reload/logout/publication/voting E2E                     |
| Drift and normal gates                         | Negative codegen regressions on changed/missing/extra output and changed/invalid input; static/build/coverage/E2E gates passed locally |
| Manual mirroring debt removed/narrowed         | Implemented wrappers and DTOs removed; remaining provisional/non-REST boundaries documented with owners                                |

Final review covered the complete diff: backend metadata versus published input,
mutator/transport dependency direction, base URL/encoding/credentials, auth races,
query key/invalidation/cache transitions, profile synchronization, search/vote
behavior, generated determinism, package ownership, Nx/CI paths and exceptions.
No blocking implementation finding remains. Existing act/jsdom navigation warnings
remain nonfailing test diagnostics. Source/schema lifecycle and GitHub required
check governance were not broadened into unrelated work.

## Independent review follow-up — 2026-11-03

Both findings from the review of `d8524ea` are addressed:

- E2E CI now installs `orbita-e2e`, `frontend` and root tooling together. A clean
  exported source fixture with npm 11.12.1 installed 682 packages using the corrected
  selective command and passed the real Nx `frontend:api-check` prerequisite.
- Removed Orval's `mutationInvalidates` wrapper for `createPost` and regenerated all
  output through the normal command. `shared/api/forum/usePublishPost.ts` composes
  generated mutation options and keys with application feed invalidation. It returns
  the caller's `onSuccess` result while leaving background refetch unawaited. Request
  DTOs, operations, mutation keys and transport remain generated/shared.
- New regressions prove pending state until an async success callback completes,
  propagation of its context, rejection through the mutation error lifecycle and
  publication completion while an active feed refetch is still pending. Existing
  transport integration and dialog/form tests exercise the same composition.

Follow-up validation:

- Root static checks passed (10 tasks; 5 unchanged tasks reused their cache).
- Frontend: 68 files / 696 tests passed; coverage gates passed with statements
  90.52%, branches 89.68%, functions 85.17% and lines 90.34%.
- Codegen regression and full 44-file drift checks passed. Production frontend
  build passed with an explicit gateway API URL.
- Real E2E run `1793704675591-07915b19`: 8/8 passed, Chromium, one worker, zero
  configured retries, including publication and cast/switch/retract after reload.
  Owned containers, image tags, networks and runtime snapshots are absent after
  both follow-up runs; Docker Engine remained ready after cleanup.
- Earlier run `1793704514449-c0d47670`: 7/8 passed; the Windows Playwright worker
  exited with native code 3221226505 before the forum scenario (reported duration
  0 ms), without an assertion failure. Docker remained ready and teardown completed.
  The complete fresh-stack rerun above passed without changing code, test assertions,
  retries, Docker settings or browser configuration. The native crash cause is unconfirmed.

Backend/gateway code was not changed by this follow-up; their earlier local checks
and successful published PR jobs are separate evidence. New remote CI requires
publishing the follow-up commit; no additional push or Jira mutation is requested.

## Develop synchronization — 2026-11-05

The new CI failures on PR #68 were genuine binding drift in GitHub's test-merge,
not a repeat of the missing-Orval installation problem. Its checked merge commit
`c35749ef075ab0a6603ab25ad94802d8a83773ea` has parents `8af67bd` (new develop) and
`d1c2021` (the published task head). PWDRZ-144 and PWDRZ-145 added usable
notifications and analytics APIs: the published inventory grew from 23 to 32
operations while the branch still committed the original 44 binding files.

- Reproduced the exact 18-path drift in a detached checkout of that test-merge.
  Normal generation produced 61 files and its read-only check then passed.
- User selected rebase. Saved the old task head under
  `refs/codex-backups/pwdrz130-before-rebase-20261105` and rebased onto `8af67bd`.
  `git range-diff` confirmed identical content for all six original task commits.
- Regenerated the complete output on the rebased branch: 17 new model/parameter
  files and updated operations/Query bindings. No generated output was edited by hand.
- Added transport regressions for the new notification operations (including nullable
  system-notification fields and empty 204 responses) and analytics query options/keys.
- Corrected legacy adapter/fixture comments and the exceptions guide: their backend
  APIs are now implemented, generated bindings are authoritative, and those unused
  planned adapters are not proof of live UI integration. Notification UI reconciliation
  remains PWDRZ-152; recommendation/AI stubs remain separately owned.
- Root static checks, exact `frontend:coverage` prerequisites and production frontend
  build passed. Frontend: 68 files / 698 tests, with statements 90.52%, branches
  89.78%, functions 85.17% and lines 90.34%; all existing gates passed.
- Exact `e2e:test` gate passed with all prerequisites, including the 61-file drift
  check. Run `1793899644492-7e408553`: 8/8 real-stack scenarios passed on Chromium,
  one worker and zero retries; managed teardown completed successfully.

The expected invalid-bearer fixture still prints Orval validation errors in the Node
regression suite; that test passes only when invalid input is rejected. Real CI
failures were the separate read-only drift check. CI continues to validate committed
output without auto-repairing it or switching away from the merge result.

History was rewritten only in the local task branch as requested. Publishing it will
require a separately authorized push with an explicit lease; `origin/develop` and Jira
are not modified by this synchronization.

## Final cleanup context map and independent check — 2026-11-05

Reviewed this map against the current code and live Jira requirements before deleting
or replacing code. Baseline source tree: published task head `dfcf847`; remote develop:
`8af67bd`. The recommendations contract remains hidden and returns 501 (PWDRZ-146,
Ivan 82288); its planned adapter behavior must survive unchanged.

| Files / boundary                                            | Independently verified state                                                                                             | Cleanup                                                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `notificationClient.ts`, `notification.dto.ts`, their tests | Four generated operations cover every route/method/parameter/status; only wrapper tests import the handwritten modules   | Remove duplicate wire DTOs and unused wrappers/tests                                                             |
| `analyticsClient.ts`, `analytics.dto.ts`, analytics tests   | Five generated operations and their models/parameter enums cover every analytics operation; no production imports        | Remove duplicate analytics API; preserve the recommendations exports separately                                  |
| `recommendation/recommendationClient.ts` and nearby tests   | Recommendations have no published operations and remain 501; existing default/custom-limit behavior is still provisional | Relocate the same adapter and four existing assertions without implementing PWDRZ-146                            |
| Generated transport/type tests                              | Exercise generated operations through the actual ApiClient, including bearer/cookies, unknown errors and 204             | Replace obsolete mock-only wrapper coverage with contract-shaped fixtures and focused generated-operation checks |
| API guide and local execution tracking                      | Still list unused implemented-contract adapters as exceptions                                                            | Remove resolved exceptions and record behavior equivalence plus remaining owned stubs                            |

Behavior review found no session, authorization, cache invalidation, retry, mapping or
UI-only logic inside the removed wrappers. Notifications' omitted pagination/filter
parameters have backend defaults `page=0`, `size=20`, `unreadOnly=false`. Analytics'
omitted trend parameters default to `posts` / `7d`, and trending posts to `24h` / 10.
Generated functions leave omitted parameters to those same backend defaults. The
positional analytics arguments become generated parameter objects; no production
caller needs an adapter for that signature change. Notification PATCH handlers do
not accept a request body, so generated body-free requests preserve their behavior.
Generated void operations normalize empty 204 bodies. Unlike the old handwritten
notification DTO, the authoritative generated model correctly permits `message=null`.

Repository-wide source/configuration searches found no other imports, exports,
barrels, dynamic imports or consumers of the removed modules. Historical codebase
maps/backlog exports were treated as reference, not executable consumers.

An additional history audit found patch-equivalent copies of PWDRZ-144/145/156 on
top of the old task branch. Using the user's already selected rebase strategy, saved
`refs/codex-backups/pwdrz130-before-final-cleanup-20261105` and rebased onto develop.
Git skipped exactly those three equivalent commits. Full Git tree IDs before/after
matched, and develop is now an ancestor, so the PR no longer repeats backend work.

### Final scope review and cleanup outcome

- Re-read live Jira PWDRZ-130/144/145/146 rather than relying on the historical
  export. The current implemented contract contains 32 operations. All four
  notification and five analytics operations have authoritative generated models,
  parameter types, endpoint functions and TanStack Query bindings.
- Removed unused handwritten notification/analytics DTOs, wrappers and their
  obsolete mock-only tests. No production consumer, barrel or package API needs
  a compatibility export. Preserved the recommendations adapter and its four
  default/custom-limit assertions under `shared/api/recommendation/`; no planned
  recommendation schema was promoted into the published contract.
- Strengthened generated transport regressions with complete typed notification,
  activity, post and platform fixtures, nullable notification messages, omitted
  query parameters, body-free notification PATCH and normalized empty 204 results.
  Added compile-time checks for notification nullability/pagination and rejected
  unsupported analytics metrics. These tests verify transport behavior with a
  mocked network; they do not substitute for backend or real-stack evidence.
- Audited non-generated production TypeScript calls against every published
  method/path using a TypeScript AST scan with normalized route parameters.
  None of the remaining 12 handwritten `apiClient` calls duplicates a published
  operation: category writes (3), comments (4), tags (2), recommendations (2) and
  AI (1) remain hidden 501 contracts owned by other tasks. Only the original
  ApiClient creates an Axios instance. Low-level rotating refresh intentionally
  uses that same instance and a generated response DTO outside Query caching.
- Reviewed the complete task diff against develop, including transport/session,
  feed/vote/search/profile compositions, generated configuration, strict drift
  checks, CI prerequisites and backend bearer metadata. No further migration gap
  or blocking in-scope issue was found. UI models, form validation, application
  cache policy, the non-REST event protocol and PWDRZ-150 state consolidation
  remain intentionally separate.
- Targeted provisional-marker check corrected stale pagination and dashboard
  comments after PWDRZ-144/145. The unticketed dashboard prototype is retained:
  its metrics/role mapping and real UI integration are not part of API generation.
  No mock data, hidden endpoint, guard or feature was enabled. PWDRZ-152/153 UI
  completion is not certified here; PWDRZ-146 (Ivan 82288) still owns real
  recommendations and ranking. No owner was contacted or Jira field changed.

### Final verification

Commands were run from the root with Node 24 and npm 11.12.1; Docker-backed
coverage/build/E2E workloads ran serially. Nx daemon/TUI were disabled. The npm
cache was placed on D: for the managed E2E install.

| Verification                                                                                         | Result / evidence                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run api:generate`, generated diff against HEAD, `npm run api:check`                             | All 61 generated files reproduced byte-for-byte; no generated working-tree changes                                                                                                       |
| `npm run check -- --output-style=static`                                                             | All 10 static tasks passed, including frontend/gateway lint, formatting, typecheck and E2E tooling                                                                                       |
| `npx nx run-many -t coverage --projects=frontend,gateway,backend --parallel=1 --output-style=static` | All three unchanged service coverage gates passed                                                                                                                                        |
| Frontend coverage                                                                                    | 67 files / 686 tests; statements 90.44%, branches 89.73%, functions 84.87%, lines 90.25%                                                                                                 |
| Gateway coverage                                                                                     | 7 suites / 51 tests; statements 97.03%, branches 86.95%, functions 92.30%, lines 96.99%                                                                                                  |
| Backend coverage / Maven verify                                                                      | 223 tests, zero failures/errors/skips; JaCoCo gates passed, including the live generated OpenAPI comparison, availability and bearer regression tests                                    |
| `npx nx run-many -t build --projects=frontend,gateway,backend --parallel=1 --output-style=static`    | All production builds passed with explicit `NEXT_PUBLIC_API_URL=http://localhost:3000/api`                                                                                               |
| Codegen regression suite (coverage prerequisite)                                                     | Clean deterministic generation plus changed/missing/extra output, changed contract and invalid input rejection passed; expected invalid-bearer fixture diagnostics are not a failed gate |
| `npx nx run e2e:test --output-style=static`                                                          | Final run `1793901857560-58edbf2c`: 9/9, Chromium, one worker, zero retries; all four prerequisites passed with no cache hits                                                            |
| Managed real HTTP recommendations case                                                               | Both GET routes returned HTTP 501 and ProblemDetail status 501 through the real gateway/backend; pending PWDRZ-146 behavior is preserved                                                 |
| Teardown                                                                                             | Both final runs' containers, image tags, networks and runtime snapshots are absent; no owned backend-test container remains; Docker Engine 29.4.3 is ready                               |
| Final source/contract review                                                                         | No deleted-module imports, no generated/backend working-tree drift, empty Git index and clean `git diff --check`                                                                         |

The earlier cleanup run `1793901374451-05ca10ec` passed the original eight
scenarios. An ad hoc recommendation probe was refused by its ownership guard
after that stack had already been removed, so it issued no HTTP requests. The
new ninth managed HTTP case supplies the missing real failure-mode evidence.
Two subsequent sandboxed Nx attempts stopped before creating a stack (Windows
IPC socket/access restrictions); the successful run used normal local Docker
access and a short process-only `NX_SOCKET_DIR`, without project, Docker or WSL
configuration changes.

All acceptance criteria are covered: committed versioned input and deterministic
output, only implemented published operations, preserved auth/cookie/401 and real
forum behavior, negative drift checks plus normal gates, and an explicit narrowed
manual-contract inventory. After the final full suite, only explanatory comments
and execution/documentation records changed; their formatting was checked.

Remote develop remains `8af67bd`, now an ancestor of the local task branch.
The remote task branch remains `dfcf847`; its existing successful GitHub checks
are baseline evidence, not a CI result for this uncommitted cleanup. The final
cleanup is unstaged and uncommitted. No push, PR creation, merge or Jira mutation
was performed. Publishing the rebased branch later requires separate push
authorization and an explicit lease.
