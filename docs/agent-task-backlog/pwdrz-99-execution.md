# PWDRZ-99 execution

## Acceptance rework, 11 November 2026

[Jira review](https://project-wdrz.atlassian.net/browse/PWDRZ-99?focusedCommentId=10193)
returned the delivered SPA to Ready after manual review of `017e867`. The
rework started from develop `76ae520`. Commit `9f97fed` corrects the form
and session outcomes. Commit `a55642c` extends managed Chromium acceptance.
The sections below this rework record describe earlier verification stages.

| Review case                        | Observed result                                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrong password, unknown username   | Real login returned 401 with the same form message. The guest could edit the retained input without a session error or Retry button.                                                        |
| Occupied username with fresh email | Real registration returned 409. The form marked the username, retained the email, password confirmation and consent, and showed no session banner.                                          |
| Corrected login and another tab    | The second tab reconciled as guest after rejection. Correcting just the password authenticated both tabs as the same user. Two explicit submissions produced two POSTs.                     |
| CSRF or profile read fails         | Adapter-backed form/provider tests distinguish failure before the POST from failure after a successful POST, including a profile 401. Neither is reported as wrong credentials.             |
| Network failure and retry          | An ambiguous POST or 502 leaves identity unknown. Retry reads the profile. A 200 restores the user, 401 confirms guest, and 503 preserves the actionable banner. Each attempt had one POST. |
| Existing or superseded identity    | A rejection with a previously authenticated identity rechecks the current cookie. A late rejection or late reconciliation cannot overwrite a newer login.                                   |

The first integrated frontend run on the unmodified implementation failed
three assertions: guest state after each rejection and credential wording
after an accepted login followed by a profile 401. The corrected tests pass
with the actual forms, provider, Zustand, generated operations and Axios.
HTTP fault responses in these tests come from the adapter.

### Completion checks

| Original Jira criteria | Verification on the rework                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1, 7, 8                | Real registration, login, reload, logout, protected navigation and two-tab reconciliation in Chromium. Frontend coverage includes stale responses, cache isolation, ambiguous outcomes and single submission.                                                                                                                                                                                                                     |
| 2, 3                   | Chromium accepted the host-only Secure/HttpOnly/Strict session cookie, Path=/, with no persistence attributes, on a local HTTPS origin. A JVM restart retained the same persisted security context and user. An isolated PostgreSQL fixture accepted an idle session two seconds before its one-hour deadline and rejected it at/after the deadline. SessionValidityFilterTest and AuthCookieFlowTest cover the 12-hour deadline. |
| 4                      | AuthCookieFlowTest, JdbcSessionConcurrencyTest and the password-change browser flow passed. In a supplemental HTTPS run, a simultaneous password change and independent sign-in both completed; subsequent profile reads by both browsers were rejected. Concurrent login and logout from one authenticated browser ended as guest. These are observed application interleavings.                                                 |
| 5, 6                   | Migrated-schema authentication/CSRF tests, Spring authorization and ownership suites, private reads and browser guards passed.                                                                                                                                                                                                                                                                                                    |
| 9, 10                  | Gateway forwarding, quotas, size/deadline, error and log suites passed. Managed browser and HTTP tests exercised real forwarding and SPA fallback.                                                                                                                                                                                                                                                                                |
| 11, 12                 | Maven verify passed on a disposable PostgreSQL database with fresh and upgrade migration tests, session persistence and WS compatibility. The scheduled cleanup removed an expired anonymous session and preserved the live session and account. OpenAPI drift and deterministic codegen checks passed for all 80 generated files.                                                                                                |

Local commands: `npm run check -- --skip-nx-cache`, frontend and gateway
`test:coverage` and `build`, `npm run api:check`, frontend `test:codegen`,
`node tools/workspace/backendTest.mjs` (Maven verify, 320 tests) and
`npm test --workspace orbita-e2e` (18 passed, one worker, zero retries).
The first Docker build exposed a TypeScript mismatch in the updated
pending-login fixture. After correction the full managed run passed,
including stack cleanup (run `1794415621330-9159751b`).

The separate HTTPS smoke used the built Express app, Spring JAR, a
self-signed test certificate and a disposable PostgreSQL instance, all
on loopback. Chromium trusted the certificate for this test context only.
No deployment infrastructure or shared accounts were used.
[CI runs for the rework branch](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions?query=branch%3APWDRZ-99-auth-rejection).

The targeted marker check retained PWDRZ-154 registration interests,
PWDRZ-104 WS delivery, PWDRZ-150 profile consolidation and PWDRZ-161
Remember Me under their existing owners. Stale token wording and token
fixtures in the touched form paths now match the session contract.

## Original implementation

Base: `4c8f082807a264d5b3fbe377c1f98a4c99aff540`, verified equal to fetched
`origin/develop` on 2026-11-08. Branch: `PWDRZ-99-session-http-boundary`.
The initial implementation used authorized local commits; branch publication was later explicitly authorized.
The review pass below does not commit, push, dispatch CI or mutate Jira.

## Verification boundaries

The user explicitly deferred E2E and real-database tests during development.
Unit tests, in-memory repository characterization, static checks and builds
remain applicable. PostgreSQL migration/concurrency, HTTPS cookies and managed
browser acceptance must be reported as unrun until separately executed; H2
and mocked success are not PostgreSQL or browser evidence.

## Session repository characterization

`mvnw.cmd --batch-mode -Dtest=JdbcSessionRepositoryTest test`: 5 tests passed.
Boot resolved Spring Session JDBC/core 4.0.2 without a version override.

The real repository with in-memory H2 demonstrates:

- A late update does not reinsert a deleted session.
- An old request's ordinary save can restore an old session ID after rotation.
- Deleting the old ID after rotation leaves the new row reachable.
- Idle expiry is checked without physical cleanup.
- A new repository instance reads persisted serialized attributes.

The corresponding migrated PostgreSQL cases are prepared in
`JdbcSessionConcurrencyTest` but have not run. No extra lifecycle table is
introduced. Standard Spring fixation protection creating a new session row
is preferred over changing the existing row's ID; authentication transitions
still require explicit concurrency verification.

## Context map

The reviewed implementation plan maps authentication/controller/security,
users/password revocation, JDBC/Flyway, API/Orval, frontend transport/providers/
forms/guards/cache, Gateway proxy/errors/limits and env/startup/E2E consumers.
Existing ownership/resource checks and managed test infrastructure are reused.
PWDRZ-104 retains real-time/destination/lifecycle work; PWDRZ-150 retains full
profile-state consolidation; PWDRZ-161 retains Remember Me. The agreed release
is one coordinated cutover with forward-only legacy schema removal.

## Implemented boundary

- Boot-managed Spring Session JDBC 4.0.2, Flyway V8 standard session tables and
  `users.auth_version`, forward-only V9 removal of `refresh_tokens`. V1–V7 are
  unchanged. No additional session lifecycle table or persistent credential exists.
- JSON register/login invoke Spring fixation protection, CSRF authentication
  strategy and explicit security-context persistence. Standard repository immediate
  flush joins the existing application transaction. The minimal serialized principal
  contains no password/hash. Logout uses Spring logout handlers and clears both
  SESSION and the configured old refresh-cookie path.
- Current-account status, auth version, current role and immutable 12-hour deadline
  are checked before using the session principal. Authenticated idle is 60 minutes;
  anonymous CSRF idle is 15 minutes. Version increments revoke all earlier sessions
  after password change. User row locking/refresh protects password verification
  against stale JPA state. Unrelated profile writes use dynamic column updates.
- Authentication/logout transitions use a PostgreSQL transaction advisory lock and
  an internal browser lineage in the standard principal-name index. This addresses
  the observed rotation/delete interleavings without a custom session repository;
  ordinary HTTP requests do not take this lock. PostgreSQL acceptance is still
  required; the local tests do not prove production transaction behavior.
- SPA bootstrap uses only `/users/me`; one Axios/Orval transport supplies cookie/CSRF
  handling, generation isolation and no automatic mutation replay. Auth status
  distinguishes checking, authenticated, guest and recoverable error. Tabs reconcile
  through BroadcastChannel/storage/focus without Web Locks or heartbeats. Focus
  verification keeps a still-valid account's form mounted. User-bound Query work is
  cancelled/cleared across identity changes.
- Gateway drops REST JWT verification, the public allowlist and its signing-key
  dependency. Raw forwarding preserves HTTP bytes, status and multiple cookies.
  Controlled upstream tests cover errors, partial responses, total upstream timeout,
  body size/deadline, forged forwarding headers and login/CSRF quotas. The 1 MiB
  body budget accommodates the maximum implemented post DTO, including JSON escaping;
  body/upstream/frontend deadlines are 10/25/40 seconds. Proxy trust defaults empty
  and accepts only explicit IPs/CIDRs. No new generic E2E/CI infrastructure was built.
- REST JWT issuance/filter/DTO/refresh persistence and browser token memory are
  removed. The isolated `WsTokenVerifier` retains meaningful existing STOMP tests,
  with token generation confined to test fixtures. No HTTP issuer is kept for WS.
- OpenAPI documents SESSION, CSRF, 201/204 and cookies; Orval output is regenerated.
  The contract test discovers production controllers without persistence. Environment,
  startup preflight, prepared managed E2E consumers and active instructions agree
  with sessions. Full policy and the endpoint/method matrix are in
  [sessions.md](../guides/sessions.md).

## Local verification (no real database)

Executed on Node 24.15.0, npm 11.12.1 and Java 17.0.19. No Docker/real-DB/browser
suite was launched after the user deferred those checks. Logs and coverage artifacts
remain ignored under `.workspace-artifacts/pwdrz-99` and service `coverage` directories.

| Check                                                          | Result                                                                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Backend database-free tests and controller contract            | 158 passed, 0 failed/skipped; real HTTP security filter wiring and H2 repository included                         |
| Backend `mvnw.cmd --batch-mode -Dmaven.test.skip=true package` | Passed after the separate unit run; not full verify                                                               |
| Frontend `test:coverage -- --maxWorkers=1`                     | 688 tests / 68 files passed; statements 97.17%, branches 92.52%, functions 95.69%, lines 97.89%; all gates passed |
| Gateway `test:coverage -- --runInBand --silent`                | 83 tests / 8 suites passed; statements 98.45%, branches 87.50%, functions 95.00%, lines 98.42%; all gates passed  |
| Frontend and Gateway lint; frontend/Gateway/E2E typecheck      | Passed                                                                                                            |
| Root `npm run check`                                           | All 10 static quality tasks passed, no cache hits                                                                 |
| Frontend/Gateway/E2E format checks                             | Passed                                                                                                            |
| Frontend and Gateway production build                          | Passed; Vite retains its existing large-chunk warning, no gate relaxed                                            |
| Pure Node workspace/environment unit tests                     | 9 passed; no stack launched                                                                                       |
| `api:generate`, `api:check`                                    | 75 committed generated files match the validated backend contract                                                 |

Backend database-free suites include all plain JUnit/Mockito classes plus
`OpenApiContractTest`, rather than only the changed auth tests. They exercise the
actual HTTP security configuration with mocked business collaborators, real SPA
CSRF JSON/header exchange, current roles/revocation, principal serialization across
repository instances, deadlines and both cookie Secure configurations. This is
separate from PostgreSQL/full-app startup acceptance. Backend package uses
`-Dmaven.test.skip=true` only after the separate unit run; it is not `verify` evidence.

Reproduce the no-PostgreSQL backend selection from `backend/` in PowerShell:

```powershell
$classes = Get-ChildItem src/test/java -Recurse -Filter '*Test.java' |
  Where-Object { (Get-Content $_.FullName -Raw) -notmatch '@(SpringBootTest|MigratedSchemaTest|DataJpaTest|WebMvcTest)' } |
  ForEach-Object BaseName
$selection = ($classes + 'OpenApiContractTest') -join ','
.\mvnw.cmd --batch-mode "-Dtest=$selection" test
```

This selection is development-time evidence only; it does not replace the normal
unfiltered `verify` release gate or change test discovery/coverage configuration.

## Acceptance trace and deferred release gates

| Jira AC | Implementation / local proof                                                                                                    | Deferred proof                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1, 7    | Session lifecycle; token/refresh consumer removal; transport/bootstrap tests                                                    | Actual full-stack authentication/bootstrap                                   |
| 2       | Real DefaultCookieSerializer tests for Secure true/false, host-only session lifetime                                            | HTTPS browser contour and deletion/retained-cookie behavior                  |
| 3       | Exact absolute boundary filter tests; real repository idle/serialization characterization                                       | PostgreSQL idle/absolute boundaries and application restart                  |
| 4       | User locks/version revocation; late-save characterization; lifecycle/failure tests                                              | Real transaction races, independent contexts and global revocation           |
| 5, 6    | Exact safe read matchers, `/me` precedence, current role/status, CSRF filter/SPA-token tests; existing resource checks retained | Migrated-schema authorization/ownership and actual auth/CSRF rotation        |
| 8       | Stale bootstrap/login/401, tab reconciliation, no replay, cache/guard/form tests                                                | Managed browser/tab races and user-cache isolation                           |
| 9, 10   | Controlled HTTP proxy tests, limits/deadlines, safe errors/logs and raw/multiple-cookie forwarding                              | Deployment topology and production HTTPS                                     |
| 11      | V8/V9, legacy cookie cleanup, WS-only verifier and existing interceptor tests                                                   | Fresh/upgrade DB preserving existing users/hashes/product data; full startup |
| 12      | OpenAPI/Orval drift, runbooks/env/preflight/E2E consumer adaptations                                                            | Full backend verify, managed E2E and CI at the implementation SHA            |

Prepared `AuthCookieFlowTest`, `JdbcSessionConcurrencyTest` and migrated schema
round trips are **unrun**, as are all existing DB-dependent suites. `mvnw verify`
and its backend LINE≥95%/BRANCH≥85% gates are **unrun**, not passed. Fresh/upgrade
migrations, actual PostgreSQL advisory-lock/JPA/session atomicity and concurrent
logout/login/password-change acceptance remain release gates. Tests with H2/mocks
must not be substituted for those checks. Browser acceptance, cross-tab cookies,
production Secure behavior and remote CI are also unrun by the user's instruction.
No deployment, push or Jira mutation occurred. Local tracking remains in progress
pending these acceptance gates; this record does not mark PWDRZ-99 fully done.

## Targeted provisional review

Exact PWDRZ-99/104/161 references and adjacent auth/proxy/WS TODOs/instructions were
checked. HTTP token-oriented guidance in the affected shared-auth/API ABOUT files
was resolved as directly related stale guidance. Legacy HTTP mechanisms are removed;
historical task exports/evidence and V1–V7 remain intact. WS subscription/delivery,
anonymous provisional interceptor behavior and established-connection lifecycle
remain PWDRZ-104, explicitly retained rather than claimed operational/unblocked.
Remember Me remains only the PWDRZ-161 extension note. Redis and Socket.IO stay
reserved; PWDRZ-150 profile consolidation and unrelated stubs are unchanged.

## Local implementation commits

- `8c93603`: standard JDBC schema and repository characterization.
- `c33b9da`: Spring session/CSRF lifecycle, revocation, API and WS compatibility.
- `4b2bc91`: transparent bounded Gateway and HTTP boundary tests.
- `a3b78a9`: SPA session transport, UI/cache/tab isolation and regenerated bindings.
- `0d37a4a`: development configuration and prepared managed-test consumers.

Checks above cover this implementation tree. The following documentation commit
records policy/evidence only. Remote publication and CI have not been requested.

## PR79 review and CI corrections (2026-11-08)

Reviewed the complete task diff against fetched origin/develop `4c8f082`,
PR head `55305f0`, current Jira Scope/AC/DoD, active instructions and adjacent
provisional auth/WS code using the review-and-refactor skill. Review changes are
an uncommitted worktree diff on that head, not a new published CI revision.
The existing acceptance policy and all coverage thresholds remain unchanged.

### CI evidence read

- [Tests run 42491426493](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions/runs/42491426493):
  frontend coverage never started because codegen used removed token schemas;
  backend ran 311 tests with one failure and four errors before verify could finish.
- [E2E run 42491426523](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions/runs/42491426523):
  15/16 browser/HTTP scenarios passed. The failed search-after-reload case received
  actual search HTTP 200 while a concurrent guest profile 401 changed the client
  generation and discarded the result. Artifact trace/network/error-context were read;
  no local E2E run or retry was substituted for that evidence.

### Findings and fixes

☢️ Issue — codegen still depended on the retired token contract

Referencing AuthResponse/expiresIn and bearerAuth stopped the coverage dependency
before it could test the new implementation.
Fix: mutate CsrfResponse for drift and use an invalid schema reference for input
rejection, retaining deterministic generation, missing/extra/changed output and
non-destructive failure assertions.

☢️ Issue — schema and session test fixtures assumed the old lifecycle

An empty MockMvc cookie array threw before three lifecycle cases executed; the
historical V7 audit test read refresh_tokens after V9 dropped it, while the schema
inventory applied domain timestamp rules to standard Spring Session tables.
Fix: omit empty cookie arguments, check V7 before the latest upgrade, assert latest
retirement and preservation of user/hash/content/history, and explicitly verify
all ten audited domain tables plus the two standard session tables. Historical
migrations and production schema were not edited. These DB cases compile but
still need real PostgreSQL execution.

☢️ Issue — session probes invalidated legitimate guest queries

Bootstrap/focus could discard a successful public search, and unconditional
focus generations could cancel ongoing authentication.
Fix: defer initial page query mounting until the first session probe settles;
coordinator-owned profile probes handle their own 401; unchanged background
identity does not change the generation; focus does not supersede an explicit
pending authentication mutation. Forms stay mounted during later auth transitions.
Actual Axios/Orval/Query regression cases cover guest search and original profile
401 preservation after successful login, without replaying the mutation (PWDRZ-155).

☢️ Issue — post-response callbacks could affect a newer identity

A profile save waited for query cancellation before updating store/cache, and an
older password-change completion could sign out a newer session after the HTTP
transport had already accepted the response.
Fix: recheck generation and identity across awaited work, and fence password
completion/error handling. Regression tests switch accounts inside those callback
boundaries and assert that the newer identity and cache remain isolated.

☢️ Issue — non-MVC SockJS mappings fell through the unknown-route policy

RequestMappingHandlerMapping does not own SockJS routes, so the MVC 404 fallback
made the actual guest /ws/info return 200 where the prior default auth boundary
required authentication.
Fix: explicitly require authenticated HTTP access to /ws and /ws/\*\*. A real
SockJS-handler/MockMvc negative control failed before the fix (expected 401,
observed 200), then the full corrected unit suite passed. The test also verifies
valid-session info access; it does not claim established connection, CONNECT,
origin or destination security. Those remain PWDRZ-104.

☢️ Issue — active review guidance still recommended the removed refresh flow

Those instructions could reintroduce legacy authentication during follow-up edits.
Fix: update the bounded auth examples to SESSION/CSRF and actual remaining files;
also isolate Gateway config tests from dotenv, following the existing test rule.
The unticketed stale Header/SessionLoader auth comments were resolved as directly
related guidance. No unrelated architectural cleanup or new task was added.

### Review verification boundary

New local checks and final results are recorded below. Real PostgreSQL, managed
E2E, full backend verify/coverage, production HTTPS and new remote CI remain unrun
under the user's development-time constraint. Reading an earlier CI run is not a
successful rerun of these fixes. No thresholds, discovery patterns, workflow gates
or scoped migration files were weakened; no commit/push/Jira mutation was made.

| Review check                                                                          | Observed result                                                                                             |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| All database-free backend suites + OpenApiContractTest, using the selection above     | 159 passed, zero skipped/failed; includes actual SockJS HTTP mapping and the fixed private boundary         |
| Backend package after that run (`-Dmaven.test.skip=true`)                             | Passed; not a full verify/coverage substitute                                                               |
| Frontend `test:coverage -- --maxWorkers=1`                                            | 696 passed / 68 files; statements 97.09%, branches 92.44%, functions 95.71%, lines 97.93%; all gates passed |
| Gateway `test:coverage -- --runInBand --silent`                                       | 83 passed / 8 suites; statements 98.45%, branches 88.39%, functions 95.00%, lines 98.42%; all gates passed  |
| `npx nx run-many -t api-check,codegen-test --projects=frontend --output-style=static` | Both actual CI prerequisites passed; 75 generated files match; no cache hits                                |
| Root `npm run check -- --skip-nx-cache --output-style=static`                         | All lint/type/format targets passed uncached                                                                |
| Frontend/Gateway production builds                                                    | Passed; large-chunk warning retained without a threshold change                                             |
| Pure Node workspace/environment unit tests                                            | 9 passed; no database/browser stack launched                                                                |
| `git diff --check`; original Jira payload comparison                                  | Passed; index untouched and only localTracking metadata edited                                              |

The corrected DB-specific cases are compiled by Maven but unrun locally. In
particular, actual application-level PostgreSQL logout/login and password-change/
login races remain acceptance evidence to obtain; repository interleaving tests
alone do not prove those application transactions. Re-run the unchanged backend
coverage and managed E2E CI gates against the published corrections before merge.
No green remote run is claimed for this uncommitted review tree. PWDRZ-99 remains
in progress; PWDRZ-104/161 ownership and the initial real-stack acceptance limits
are preserved.
