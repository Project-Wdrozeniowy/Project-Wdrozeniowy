# Browser and cross-service tests (PWDRZ-117)

This package verifies the real browser → gateway → backend → PostgreSQL path.
It complements Vitest/RTL, Jest/Supertest and Java integration tests. It neither
replaces them nor contributes an E2E line-coverage percentage.

## Prerequisites and commands

- Node.js 24, npm and a running Docker Engine with Compose.
- Network access for npm, browser downloads and initial Docker builds.
- Free loopback ports 3101 (frontend), 3100 (gateway) and 8180 (backend).
- No host Java/Maven installation or developer `.env` files are needed.

From `e2e/`:

```bash
npm ci
npm run browsers:install
npm run typecheck
npm run format:check
npm run test:infra
npm test
```

Linux CI installs browser system packages with
`npx playwright install --with-deps chromium` instead of `browsers:install`.
The package pins Playwright 1.64.1; its installed Chromium is used, not an
arbitrary system Chrome. Windows verification uses Node 24.15.0 / bundled npm
11.12.1; a globally overriding npm 12 previously caused unrelated install-policy
errors in this workspace. If needed, invoke the bundled npm CLI with Node rather
than changing global configuration.

`npm test` owns the complete lifecycle. It creates source snapshots without
local secrets/dependencies/build output, installs and builds the snapshot
frontend, builds the existing backend/gateway Dockerfiles, waits for real HTTP
readiness, starts Next.js in production mode and runs Playwright. It never reuses
an existing server or overwrites the developer's frontend `.next`.

The initial suite is Chromium desktop, one worker and **zero retries**.
Browser contexts and users are independent between tests. Wait for observable
state/HTTP responses, not fixed sleeps. `test.only` is forbidden. Failure traces,
screenshots, HTML report and service logs are saved under `artifacts/<run-id>/`.

## Environment and isolation

The launcher supplies test-only values; the root/frontend/gateway `.env` files
are not copied into snapshots or loaded by Compose.

| Setting                  | Value / behavior                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| Frontend origin          | `http://127.0.0.1:3101`                                                                                  |
| Gateway origin           | `http://127.0.0.1:3100`; frontend API base ends in `/api`                                                |
| Backend readiness        | `http://127.0.0.1:8180/api/forum/categories`                                                             |
| Database                 | Fresh `orbita_e2e` database in a unique Compose project, tmpfs storage, no host DB port                  |
| DB password / JWT secret | Generated per run; the same Base64 JWT key is supplied to backend and gateway                            |
| CORS                     | Exact frontend origin                                                                                    |
| Cookies                  | `COOKIE_SECURE=false` on this HTTP-only local stack; HttpOnly/SameSite/path behavior stays real          |
| Migrations               | Normal Flyway V1–V7 and Hibernate validate; no create-drop profile                                       |
| Rate limiting            | Test-only max 1000 avoids fixture/readiness exhaustion; rate limiting itself is tested in gateway suites |

To resolve a port conflict, set `E2E_FRONTEND_PORT`, `E2E_GATEWAY_PORT` and/or
`E2E_BACKEND_PORT` before `npm test`. Only distinct numeric ports are accepted;
hostnames, credentials and production URLs cannot be selected through these
options. All origins and the frontend build environment derive from those ports.
Do not mix `localhost` and `127.0.0.1` in this stack.

Each test uses a random `e2e_<hex>` username, `<username>@example.test` email and
synthetic `E2ePassword123!` password. API fixtures create accounts using the real
gateway registration endpoint; browser login remains a UI action. The browser
registration test creates its own account through UI. Tests use Flyway's existing
categories rather than inserting schema-dependent SQL or adding test-only Java
endpoints. The fixture request context does not share browser session cookies.

Teardown runs in `finally` on normal success/failure and handled termination:
stop the owned frontend, capture Compose logs, remove only the unique project's
containers/networks/local image tags and delete its checked runtime directory.
The tmpfs database is destroyed; no user-delete API or persistent developer data
is needed. Docker volumes from the normal stack are not touched. Ctrl+C requests
cleanup. A machine crash/SIGKILL cannot guarantee teardown; use `artifacts/<run-id>/run.json`
to identify only the `orbita-e2e-<run-id>` resources, and do not run global Docker
prune/down commands. A conflicting leftover service makes the next run fail
rather than reuse an unverified stack. GitHub hosted runners are ephemeral.

Direct `npx playwright test` is intentionally rejected without the managed-run
environment. `storageState` from a shared rotating refresh session is not reused.
No token is placed in localStorage/sessionStorage or read from `document.cookie`.
Artifacts contain synthetic account/network data; keep access restricted and
never use real account credentials. CI artifact retention is seven days.

## Scenario boundaries

1. Browser registration → HTTP 201/profile 200 → authenticated UI.
2. Browser login → reload with actual refresh → logout 204 → reload remains guest.
3. Invalid credentials → actual 401 and visible error, no authenticated UI.
4. Browser post creation → protected gateway POST 201 → persisted post visible
   in the feed after reload; an additional real API read confirms stored content.
5. **HTTP integration**, not browser E2E: anonymous protected write → 401 and no
   persisted post in a subsequent real read.

PWDRZ-128 owns displayName mapping and PWDRZ-154 provisional interests; registration
does not certify those fields as implemented. Post details remain a placeholder,
so the forum scenario does not fake a completed detail screen. Comments
(PWDRZ-142/67), notifications/STOMP (PWDRZ-104), full JWT expiry/replay matrices,
cross-browser expansion and performance are not part of this initial gate.
Logout is not claimed to revoke already issued stateless access JWTs.

## Controlled failure and CI

```bash
npm run test:probe
```

This starts another fresh stack and selects only `failure.probe.ts`. It first
finds the real login heading, then deliberately expects a nonexistent heading.
**Expected result: exit 1**, a failed browser assertion, trace/screenshot, followed
by teardown. It is not a `test.fail`, ignored test, missing-server failure or
allowed-failure CI step. The normal run does not select this probe.

The separate E2E workflow runs on all PRs and pushes to main/develop. Selective
execution remains PWDRZ-137. Manual workflow input `failure_probe=true` runs the
same negative probe; default is the real positive suite. Dispatch was verified
on the published PWDRZ-117 branch using its registered workflow ID. If GitHub
does not yet expose a newly added workflow, do not count an unavailable dispatch
as executed; the local probe runs the identical failing command.
The stable check name
is **`E2E (Chromium)`**. A failure is not suppressed; artifacts upload with
`always()`. Required-check configuration and actual fail/pass evidence are
recorded in [the execution record](../docs/agent-task-backlog/pwdrz-117-execution.md).
The verified required check uses strict mode on develop/main/staging and the
GitHub Actions source. Existing organization-admin bypass on develop/main is
preserved. A declared workflow alone is not proof of a passing or enforced gate.
No screenshot/trace or `artifacts/` output belongs in Git.
