# PWDRZ-118 — baseline and coverage scope audit (stages 1–2)

Recorded on 2026-10-16 (Europe/Warsaw). This is an observation of the **existing**
coverage settings, not a proposed threshold or a baseline after changing exclusions.
No coverage configuration, tests, threshold, or CI gate was changed for this audit.

**2026-10-16 correction from stage 3:** the backend `target/jacoco.exec` used
here contained five accumulated sessions. Its counters must not be treated as
evidence from a single successful test run. A fresh 187-test run with one
session subsequently confirmed the same counters, and report/check were
verified against that clean file. See
[`pwdrz-118-stages-3-4.md`](pwdrz-118-stages-3-4.md) for the corrected provenance,
expanded scope, and denominator comparison. Frontend/gateway results below
are unaffected by this backend issue.

## Reproducible reference

- Branch: `develop`; HEAD and `origin/develop`:
  `cc998e7ec9f627be613f902638b96cc780d4f40e`.
- GitHub's `develop` commit list was checked on 2026-10-16 and showed `cc998e7`
  at its head. The tracked tree was clean before this audit.
- Host: Windows 11 Home, build 26200; Node.js 24.15.0; npm 11.12.1;
  Java Temurin 17.0.19+10; Maven 3.9.9; Docker 29.4.3; isolated PostgreSQL
  16.14 (`postgres:16-alpine`).
- Installed test runners: Vitest and `@vitest/coverage-v8` 3.2.4; Jest 29.7.0;
  ts-jest 29.4.9; JaCoCo 0.8.12 (configured in `backend/pom.xml`).
- Locked dependencies already existed in `frontend/node_modules` and
  `gateway/node_modules`; no package installation was part of the two JS runs.

Commands, run from each service directory:

| Service | Command actually used | Exit | Report |
| --- | --- | ---: | --- |
| Frontend | `& 'C:\Program Files\nodejs\npm.cmd' run test:coverage` | 0 | `frontend/coverage/index.html`, `frontend/coverage/lcov.info` |
| Gateway | `& 'C:\Program Files\nodejs\npm.cmd' run test:coverage` | 0 | `gateway/coverage/index.html`, `gateway/coverage/lcov.info` |
| Backend | Installed Maven 3.9.9 `mvn.cmd --batch-mode -Dmaven.repo.local=C:\Users\Ruslan\.m2\repository verify`, with the test environment below | 0 | `backend/target/site/jacoco/jacoco.xml`, `backend/target/pwdrz118-baseline.log` |

The normal PowerShell `npm` launcher failed because it pointed at a missing
`npm-cli.js`; calling the installed `npm.cmd` ran the unchanged package scripts.
`backend/mvnw.cmd` failed before Maven started (`Cannot index into a null array`
in its PowerShell portion), so the installed wrapper distribution's Maven 3.9.9
binary ran the same `verify` lifecycle. Maven's default local repository
resolved to unwritable `C:\.m2\repository` in this environment; the explicit
repository path above and access to that user cache were required to resolve
the missing `maven-jar-plugin` artifact. These are host-specific command
workarounds, not project changes.

Backend verification used an ephemeral PostgreSQL container on host port 55432,
with database/user `devpulse` and a test-only password. The Maven process had
`SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:55432/devpulse`, matching
`SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `POSTGRES_DB`,
`POSTGRES_USER`, `POSTGRES_PASSWORD`, and the same non-production `JWT_SECRET`
value used by `.github/workflows/test.yml`. Reproduce with a fresh PostgreSQL 16
container and those environment variables. Do **not** run the tests against the
repository's existing persistent Compose volume: ordinary Spring tests use
`ddl-auto=create-drop`. The isolated container had no mounted volume and was
removed after the run. The first backend attempt without PostgreSQL failed
with connection refusal (187 tests, 75 errors); it is not the baseline. The
successful retry is the baseline below.

Exact local backend retry (PowerShell, from the repository root; the password
is disposable and only belongs to this temporary container):

```powershell
docker run --rm -d --name pwdrz118-baseline-20261016 -e POSTGRES_DB=devpulse -e POSTGRES_USER=devpulse -e POSTGRES_PASSWORD=pwdrz118_test_only -p 55432:5432 postgres:16-alpine
while ($true) { docker exec pwdrz118-baseline-20261016 pg_isready -U devpulse -d devpulse; if ($LASTEXITCODE -eq 0) { break }; Start-Sleep -Seconds 1 }
cd backend
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://localhost:55432/devpulse'
$env:SPRING_DATASOURCE_USERNAME = 'devpulse'
$env:SPRING_DATASOURCE_PASSWORD = 'pwdrz118_test_only'
$env:POSTGRES_DB = 'devpulse'
$env:POSTGRES_USER = 'devpulse'
$env:POSTGRES_PASSWORD = 'pwdrz118_test_only'
$env:JWT_SECRET = 'ci-test-secret-key-that-is-long-enough-for-hmac-sha256'
& 'C:\Users\Ruslan\.m2\wrapper\dists\apache-maven-3.9.9\3477a4f1\bin\mvn.cmd' --batch-mode '-Dmaven.repo.local=C:\Users\Ruslan\.m2\repository' verify
cd ..
docker stop pwdrz118-baseline-20261016
```

The container was stopped and auto-removed, and Docker Desktop was returned
to its original stopped state. On a host where the Maven wrapper works,
`./mvnw --batch-mode verify` runs the same Maven lifecycle with these database
environment variables.

## Baseline with current exclusions

| Service | Tests and gate | Statements | Branches | Functions/methods | Lines |
| --- | --- | ---: | ---: | ---: | ---: |
| Frontend | Suite passed; current gate is 65% for all four metrics | 1344/1559 = 86.20% | 355/385 = 92.20% | 77/85 = 90.58% | 1344/1559 = 86.20% |
| Gateway | 48/48 tests, 5/5 suites passed; current gate is 65% for all four metrics | 122/134 = 91.04% | 35/44 = 79.54% | 21/25 = 84.00% | 120/132 = 90.90% |
| Backend JaCoCo **report** | 187/187 tests passed; `verify` succeeded | — | 299/347 = 86.17% | 242/251 methods = 96.41% | 873/908 = 96.15% |
| Backend JaCoCo **check** | Existing gate: at least 65% lines, bundle level | — | Not gated | Not gated | 661/669 = 98.80% |

Backend's report and gate have different denominators. The `report` execution
includes 60 classes with executable counters; the `check` execution excludes
specified classes and analyzes 47. The check ratio above was reconstructed by
summing the XML `LINE` counters of the 47 non-excluded classes (661 covered,
8 missed); it agrees with the check's class count and successful result. The
report's 873/908 is **not** the ratio against which the current backend gate
operates. The report also contains 13 excluded executable classes, with
212/239 lines covered. These figures must be kept separate in future decisions.

Coverage here comes from all tests run by the three commands, including
component and integration tests; it is not unit-test-only coverage. Generated
HTML/LCOV/XML files and the backend log are ignored local evidence. The
file-by-file source inventory is preserved in [`pwdrz-118-scope.csv`](pwdrz-118-scope.csv).
The CSV's `coveredLines`/`totalLines` are from the current reports, blank for
files without a line counter. For Java it maps source files to JaCoCo
`sourcefile` counters; the gate itself operates on class files, so 45 source
files with line counters correspond to 47 included classes.
The inventory covers tracked production TypeScript/TSX and Java source files,
which these line-coverage tools can instrument. CSS, images, Markdown,
environment/config files, and Flyway SQL migrations are outside these code
counters. Migration compatibility is exercised by `@MigratedSchemaTest`, not
represented as SQL line coverage. Test files, `src/test` setup, and generated
or declaration files are not production rows in the CSV. Every non-excluded
frontend production TS/TSX file appeared in LCOV, including unimported files
with zero coverage.

## Scope inventory and exclusion decisions for the next stage

This section identifies changes to consider later; none was applied. `remove`,
`keep`, and `narrow` below refer to existing exclusions, not to thresholds.

### Frontend

The inventory contains 129 tracked production `.ts`/`.tsx` files: 37 appear
in the current LCOV report and 92 do not. Of the latter, 50 are under
`src/app/**`, 41 under `src/shared/**`, and one under `src/utils/**`.
Fourteen excluded `*.dto.ts` files were inspected as TypeScript interfaces
and type aliases with no runtime statements. The remaining broad exclusions
also hide executable hooks, providers, guards, API clients, UI interactions,
formatting and constants. Tests under excluded directories still run; their
production files do not contribute to the reported percentage.

| Existing exclusion | Decision | Evidence and reason |
| --- | --- | --- |
| `src/app/**` | **Remove** | Hides `AuthGuard`, `RoleGuard`, `AuthProvider`, feed, pagination, profile and page behavior. Several have tests that run now. A route wrapper with only static rendering may be considered as an exact-file exception later, after its contents are checked. |
| `src/shared/**` | **Remove** | Hides `api/client/api.ts`, auth/forum clients, `useForumPosts`, `useVotePost`, token memory, and tested `FormField`. `*.dto.ts` produces no runtime statements and does not justify excluding the entire directory. |
| `src/utils/**` | **Remove** | Hides executable `format.ts`, which already has tests. |
| `src/components/**`, `src/hooks/**`, `src/lib/**`, `src/constants/**` | **Remove stale patterns** | These top-level `src` directories have no tracked production TS/TSX files at this SHA. Active hooks and constants moved under `src/shared/**`. |
| `src/test/**`, `**/*.d.ts`, tool configuration, `.next/**`, `node_modules/**` | **Keep** | Test infrastructure, declarations, tooling, generated output or dependencies rather than application runtime. |
| Exact static data/presentation files, if an exclusion is still desired | **Narrow, subject to owner review** | Candidates include `src/shared/constants/categories.const.ts`, `src/shared/ui/icons.tsx`, and `OrbitaLogo.tsx`. This is a possible file-level rationale, not an instruction to blanket-exclude UI or constants. |

Particularly important hidden paths: `src/app/_guards/`,
`src/app/_providers/AuthProvider.tsx`, `src/shared/api/client/api.ts`,
`src/shared/auth/tokenMemory.ts`, `src/shared/api/forum/useVotePost.ts`,
`src/shared/api/forum/useForumPosts.ts`, and the real feed UI under
`src/app/(main)/`. The test file inventory and current reports confirm these
are not merely type definitions. Current frontend line coverage is lower than
the 96.77% quoted from the 2026-10-11 workflow because this SHA includes
13 later commits and a materially changed frontend structure; the old run is
not a baseline for this tree.
The successful frontend run emitted React `act(...)` warnings in several
create-post component tests. These did not fail the current gate, but the test
output should not be described as warning-free.

### Gateway

Twelve tracked production `.ts` files were inspected: nine are in LCOV, two
are explicitly excluded, and `src/types/index.ts` contains only TypeScript
types/declaration merging and has no runtime report entry. The active API and
WebSocket proxies are included. `src/routes/wsProxy.ts` has 5/9 covered lines,
and its error branch is not covered (0% branch coverage for that file).

| Existing exclusion | Decision | Evidence and reason |
| --- | --- | --- |
| `!src/index.ts` | **Keep** | Exact process bootstrap: `app.listen` plus startup logging. |
| `!src/middleware/authGuard.ts` | **Keep temporarily; owner decision required** | Contains authentication redirects but has no import/reference from the active gateway app at this SHA. Confirm whether it should be wired and tested or removed as dead code. If it becomes active, remove this exclusion. |
| `!src/**/*.d.ts` | **Keep** | Type declarations only. |

The previously quoted gateway **91.04%** is the *statement* value on this
run; the line value is **90.90%**. The quoted 79.54% branch value still matches.
Jest's `src/**/*.ts` collection includes active `wsProxy.ts`, so the review
should not mistake low coverage for an exclusion.

### Backend

The inventory contains 98 Java production source files. Forty-five map to
line counters included in the check; 27 source files match a `check` exclusion,
including 13 with executable line counters; the other 26 have no executable
line counter and are not excluded by a package rule. The exact per-file status
and line counts are in the CSV. JaCoCo `report` has no matching package
exclusions, whereas `check` has the list below.

| Existing `check` exclusion | Decision | Evidence and reason |
| --- | --- | --- |
| `BackendApplication.class` | **Keep** | Exact application entry point. |
| `auth/dto/**` | **Remove broad pattern** | Current DTOs have no executable line counters, so removing it does not add business lines; a package rule could hide future mapping logic. |
| `auth/entity/**` | **Remove broad pattern** | Current entity/enum executable lines are covered, but the package rule would hide future domain methods. Schema behavior still needs migration-backed tests independent of line coverage. |
| `exception/**` | **Remove** | `GlobalExceptionHandler` is executable HTTP/security error behavior (19/23 report lines); package-level exclusion is unjustified. |
| `config/**` | **Remove** | Contains `SecurityConfig` (37/38), `WebSocketConfig` (10/10), and `OpenApiContractCustomizer` (104/108). These are security, transport, and published-contract behavior. |
| `ai/**` | **Narrow** | Include `AiController` (a current 501 stub, 2/2 lines); retain an exact DTO-only exclusion only if it remains useful. Reassess the controller when PWDRZ-147 implements it. |
| `websocket/**` | **Narrow urgently** | Include `WebSocketAuthInterceptor` (0/14 lines), which validates JWT in STOMP CONNECT, plus the controller (1/3). DTO-only files have no line counters and could be excepted narrowly. |
| `analytics/dto/**` | **Keep with explicit rationale** | DTO-only package; no executable line counters at this SHA. Review again if methods are added. |

`WebSocketAuthInterceptor` is the clearest uncovered security path hidden by
the current gate. Other excluded executable paths include security response
handling in `SecurityConfig`, exception translation in
`GlobalExceptionHandler`, and OpenAPI contract transformation. Their high
current line coverage does not make a package exclusion meaningful.

## Open questions and boundaries before stage 3

1. Confirm the intended fate of unused `gateway/src/middleware/authGuard.ts`.
2. Ask the frontend owner which *exact* static UI/data files, if any, merit a
   narrow exclusion. The current comments claiming all shared files are types,
   all hooks are unsuitable for tests, and app UI is covered by E2E are false
   for this tree. The automated E2E gate belongs to PWDRZ-117 and does not
   currently establish coverage of these files.
3. Ask the backend owner whether any DTO/boilerplate exclusions should remain
   as exact files. The `websocket/**` exclusion cannot remain in its current
   form while it hides the JWT interceptor.
4. The shared local backlog JSON predates this Jira issue and has no
   `PWDRZ-118` entry, so its `localTracking` block could not be updated without
   adding a new Jira payload. Jira itself reports the issue In Progress.

Stage 3 (changing exclusions and measuring the expanded scope) and the
selection of new thresholds have **not** been performed.
