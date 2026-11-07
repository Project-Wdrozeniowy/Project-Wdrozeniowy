# PWDRZ-160: Vite SPA served by Express

This is a runnable architecture experiment, not adoption of the migration.
No PR or merge belongs to this branch. The backend, API contracts, schema,
TanStack Query cache policy, forms and existing product limitations are preserved.

- Experiment: `PWDRZ-160-vite-spa-spike`.
- Pinned baseline: `2bd7d6c8d0f24a737304fee07174de5a0c03477a` (`origin/develop` verified at kickoff).
- Results, actual evidence and remaining acceptance: [results.md](results.md).
- `git rev-parse HEAD` identifies the checked-out experimental revision. Use the
  final handover SHA; uncommitted intermediate snapshots are not final evidence.

## Run the experiment

Requirements: Node 24 / npm 11, Docker Desktop/Compose and Chromium. Java 17 is
needed for root Maven build/coverage; the self-contained Docker stack builds Java
inside its image. Keep the normal developer stack and its data untouched.

From a clean checkout of the experimental branch:

```powershell
npm ci
npm exec --workspace orbita-e2e -- playwright install chromium
npm run check
npm run build
```

Production API URLs and credentials are not compiled into browser assets. The
browser always uses relative `/api`; the gateway owns the single origin. There
is no `NEXT_PUBLIC_API_URL` requirement and no frontend `start` server.

For a persistent **disposable comparison stack**, use the existing isolated
Compose definition rather than the default developer database/ports. Run this
PowerShell block from the experiment checkout root, in a dedicated terminal:

```powershell
$env:E2E_PROJECT = 'orbita-spike160-experiment'
$env:E2E_RUNTIME = (Get-Location).Path.Replace('\', '/')
$env:E2E_GATEWAY_PORT = '32200'
$env:E2E_BACKEND_PORT = '32280'
$env:E2E_DB_PASSWORD = node -e "process.stdout.write(require('node:crypto').randomBytes(24).toString('hex'))"
$env:E2E_JWT_SECRET = node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64'))"
New-Item -ItemType Directory -Force .workspace-artifacts | Out-Null
Set-Content -LiteralPath .workspace-artifacts/spike160-empty.env -Value ''
docker compose --env-file .workspace-artifacts/spike160-empty.env -f e2e/compose.yml -p orbita-spike160-experiment up --build -d
```

Open `http://127.0.0.1:32200`. Wait for the backend's
`http://127.0.0.1:32280/api/forum/categories` to return 200; inspect the exact
project logs if startup fails. Use synthetic accounts. No external AI provider
is configured. The gateway image builds the frontend itself, without host
`dist` or `node_modules`. Only gateway and backend ports are exposed; DB uses
fresh tmpfs storage, Redis is retained. The E2E-only quota is 1000 for fixture
setup; production API policy is independently tested with its actual limits.

In the **same terminal**, inspect/stop only that project:

```powershell
docker compose --env-file .workspace-artifacts/spike160-empty.env -f e2e/compose.yml -p orbita-spike160-experiment logs --tail 100
docker compose --env-file .workspace-artifacts/spike160-empty.env -f e2e/compose.yml -p orbita-spike160-experiment down --volumes --remove-orphans --rmi local
```

The last command removes this explicitly named disposable stack and its test
DB. It does not stop another project or delete normal development data. Record
these generated environment values privately if you need to reattach from a
new terminal; do not commit them. `stop` instead of `down` retains containers,
but this database is deliberately disposable, not durable user storage.

## Development and direct commands

For the normal local workflow, copy root and gateway environment templates,
set `POSTGRES_PASSWORD` and identical generated Base64 `JWT_SECRET`, and keep
`COOKIE_SECURE=false` for local HTTP. `frontend/.env` is optional.

```powershell
npm run dev
```

This preflights 3000/3001, starts Compose PostgreSQL/Redis/backend (8080), waits
for readiness, then starts Vite 3001 and API-only Express 3000. Vite proxies
`/api` and `/ws` to Express; API calls never bypass JWT verification. Do not run
a Compose gateway on the same 3000 port. Ctrl+C stops owned source processes;
Compose services/data remain by the existing convention. Use the separate
comparison stack above when normal developer ports or databases are in use.

After `npm run build`, `npx nx run gateway:serve` builds its frontend/gateway
dependencies and starts Express with the compiled SPA. The gateway loads its
own `.env`. `npm start --workspace gateway` also enables SPA mode and clearly
fails if `frontend/dist/index.html` is missing. `SPA_DIST_DIR` optionally sets
an absolute artifact directory; `npm run dev --workspace gateway` is API-only.

On this Windows machine the global npm is 12, outside repository prerequisites.
The checks use bundled npm 11 explicitly:
`node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' <npm arguments>`.
The long nested worktree also needs `NX_ISOLATE_PLUGINS=false` and
`NX_DAEMON=false` to avoid Windows Nx socket-length restrictions. These are
local execution settings, not changes to CI or coverage policy.

## Run acceptance

```powershell
npm run api:check
npm run test:tooling
npm test
npm run test:e2e
# Intentionally fails a real assertion; expected nonzero, with cleanup:
npm run test:probe --workspace orbita-e2e
# New fresh stack must pass after the failure probe:
npm run test:e2e
npm run validate
```

All lifecycle/browser/coverage targets remain noncached. For final uncached
static/build verification use `npm exec -- nx run ... --skip-nx-cache`.
Managed E2E accepts only numeric, distinct `E2E_GATEWAY_PORT` and
`E2E_BACKEND_PORT`; unset the manual comparison variables/use another terminal
before invoking it. `E2E_FRONTEND_PORT` is obsolete and rejected. Per-run source
snapshots, credentials, project names and cleanup are launcher-owned. Never
replace them with a developer server or mock API. A crash/SIGKILL cannot
promise cleanup; a Windows/npm terminal may also force-stop the whole tree
before the handler runs. Handled SIGINT is verified separately; use the exact recorded project in `e2e/artifacts/<id>/run.json`.

## Compare with the pinned Next baseline

The original checkout remains on develop. The baseline is detached and its
source is unchanged; do not compare against a moving develop or silently import
parallel work. Create a separate baseline worktree at the pinned SHA if needed.
Use separate terminals, ports, projects and fresh accounts for each version.

In the baseline checkout, install with `npm ci`; set `NEXT_PUBLIC_API_URL` to
`http://127.0.0.1:32100/api` **before building**. Start its existing
`e2e/compose.yml` exactly as above with:

- project `orbita-spike160-baseline`;
- `E2E_RUNTIME` = absolute baseline checkout path;
- `E2E_FRONTEND_PORT=32101`, `E2E_GATEWAY_PORT=32100`, `E2E_BACKEND_PORT=32180`;
- freshly generated DB/JWT values, shared only between that baseline's services.

Then run in a second baseline terminal:

```powershell
$env:NEXT_PUBLIC_API_URL = 'http://127.0.0.1:32100/api'
npm run build
npm start --workspace frontend -- --port 32101 --hostname 127.0.0.1
```

Open `http://127.0.0.1:32101`; its API uses `32100`. Stop Next with Ctrl+C and
run the Compose teardown with **baseline** project/path/env. No default-stack
`down`, global prune, reset or rebase is necessary. Both versions can run
simultaneously if Docker has sufficient memory; sequential fresh stacks are
also valid. The managed baseline acceptance remains its own unchanged
`npm run check/build/test/test:tooling/test:e2e` workflows.

## Route ownership and behavior

`src/main.tsx` mounts App, which renders one React Router **data-mode browser router**.
`app/router/routes.tsx` composes the ten page slices through three layouts and
two pathless guard groups. Each page loads lazily through its public entry.
Page-private UI/helpers live in `pages/<screen>`, providers stay in app, and
common feed presentation lives in `widgets/post-feed`. There are no
loaders/actions or server handlers: Query/Orval continue to own request/cache
behavior. The former Next route directories and special filenames were removed
in the user-authorized [structure follow-up](route-structure.md).
See the [current frontend guide](../../guides/frontend/README.md) for the tree
and import/public-API rules.

| URL                                   | Composition / existing behavior                                      |
| ------------------------------------- | -------------------------------------------------------------------- |
| `/login`, `/register`                 | Root Query/Auth/Toast + auth layout and existing forms               |
| `/`                                   | Main header/sidebar + real feed; sort tabs retain baseline behavior  |
| `/forum`                              | Main + existing topic/tag/page URL-driven query, creation and voting |
| `/forum/:slug`                        | Main + existing detail placeholder/comments boundary                 |
| `/search`                             | Main + real search with `q`, `type`, `page`                          |
| `/dashboard`, `/profile`, `/settings` | Main + AuthGuard; existing implemented/sample-data boundaries        |
| `/admin`                              | Main + AuthGuard + ADMIN RoleGuard; existing admin screen            |
| unmatched URL                         | SPA shell HTTP 200, client not-found view with home link             |

Guards remain UI concerns; API resource authorization remains in Spring and
HTTP JWT verification in Express. Pending session initialization shows the
existing loader. Router lazy loading has an initial loader and a route error
view; there is no general business-data loader rewrite. ScrollRestoration
handles history/new-route scroll, `preventScrollReset` preserves category
selection position. Path changes focus the new main region; query-only updates
retain keyboard/filter/pagination focus. No inline router restoration script
is required without framework/SSR context. Page title/description stay the existing
shared Orbita values; per-post metadata/SSR is not introduced.

## Context map and boundaries

| Area         | Concrete entry points / dependencies                              | Verification                                            |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------- |
| Route shell  | main.tsx, app/router, app/layouts, pages and navigation consumers | actual router + browser matrix                          |
| Build        | frontend package/tsconfig/eslint/Vite/Vitest, root lockfile       | locked install, strict static gates, build              |
| HTTP/session | api.ts, providers, generated operations, tokenMemory              | unchanged transport matrix + real auth                  |
| SPA host     | gateway app/config/index, routes/spa.ts, API/WS proxies           | real host and gateway regressions                       |
| Packaging    | gateway Dockerfile, root/E2E Compose, .dockerignore               | secret-free clean context, rebuilt image                |
| Workspace    | project.json, tools/workspace dev/build/snapshot                  | lifecycle, Nx build/output/cache checks                 |
| Acceptance   | e2e/scripts + original specs + spa.spec.ts                        | managed built image and actual Spring/Postgres          |
| CI           | frontend/gateway builds, lint/test/e2e workflows                  | local equivalents; remote execution reported separately |

Reference patterns are existing auth guards/providers, generated transport,
WS boundary matching, workspace process ownership and E2E source snapshots.
No public API or DB migration is required. Configuration/runtime changes are
branch-local. No general FSD rewrite, profile-state consolidation, backend
change, realtime completion or product redesign belongs to the experiment.
