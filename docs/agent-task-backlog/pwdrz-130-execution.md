# PWDRZ-130 execution record

Date: 2026-11-02. Base: `develop` / `5b6020014fc474aafba12229efb7e14220763edc`.
Branch: `PWDRZ-130-generated-api-bindings`. The user subsequently authorized a
logical commit series without co-author trailers. Push, PR creation, merge and
Jira mutations remain outside the requested scope.

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
| Forum/search  | Generated operations/options; built-in publish invalidation; meaningful feed/search/vote composition retained                             |
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
New GitHub checks have not been published: the user requested local PR preparation
only. The bounded backend metadata change should receive backend review in the PR.

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
