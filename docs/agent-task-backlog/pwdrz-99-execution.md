# PWDRZ-99 execution

Base: `4c8f082807a264d5b3fbe377c1f98a4c99aff540`, verified equal to fetched
`origin/develop` on 2026-11-08. Branch: `PWDRZ-99-session-http-boundary`.
Local commits are authorized; no push or Jira mutation is authorized.

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
