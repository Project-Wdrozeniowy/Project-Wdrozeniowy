# AGENTS.md

> Agent/tooling entry point. Developers should start with [README.md](README.md)
> and the [documentation map](docs/README.md); team contribution rules live in
> [docs/guides/README.md](docs/guides/README.md). Commands and architecture
> notes below are agent context, not a replacement for source/configuration.

## Project Overview

**Orbita** is a full-stack community forum platform. Users can register, post articles, comment, vote, and receive real-time notifications.

The repository is a **manual monorepo** containing three independent services and a shared Docker Compose stack:

```
Frontend (Next.js 16)  →  Gateway (Express 5)  →  Backend (Spring Boot 4)  →  PostgreSQL 16
         port 3001             port 3000                  port 8080
```

- **Frontend** (`frontend/`) — Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Zustand, React Query, Axios, Zod, React Hook Form
- **Gateway** (`gateway/`) — Node.js, Express 5, TypeScript 6; performs JWT verification, rate limiting, CORS, and reverse-proxies all `/api/*` traffic to the backend
- **Backend** (`backend/`) — Java 17, Spring Boot 4, Spring Security, Spring Data JPA, PostgreSQL, Flyway migrations, JWT (jjwt 0.12.6)
- **Infra** — PostgreSQL 16 + Redis 7 (via Docker Compose); Redis is provisioned but not yet wired in application code

Database schema is managed by Flyway (V1–V5: users, forum, notifications, analytics, and refresh-token rotation).
ER diagrams live in `docs/db-schema*.mmd`.

---

## Environment Setup

### Prerequisites

- Node.js ≥ 24 (matches CI)
- Java 17 (Temurin recommended)
- Maven wrapper included (`./mvnw`)
- Docker + Docker Compose

### 1. Copy environment files

```bash
# Root-level secrets (PostgreSQL, JWT, Redis)
cp .env.example .env

# Gateway environment
cp gateway/.env.example gateway/.env

# Frontend API base URL
cp frontend/.env.example frontend/.env

# Edit .env — the only required change before running locally:
# POSTGRES_PASSWORD=<any password>
# JWT_SECRET=<base64-encoded string, at least 32 bytes>
#   Generate: openssl rand -base64 64 | tr -d '\n'
```

> **Critical**: `JWT_SECRET` must be **identical** in root `.env` (used by backend via Docker Compose)
> and in `gateway/.env`. A mismatch causes 401 on every authenticated request.

### 2. Start the database and backend via Docker Compose

```bash
docker compose up -d postgres redis backend
docker compose logs --tail=100 # inspect startup
```

PostgreSQL is available at `localhost:5432`. Flyway migrations run automatically on backend startup.

### 3. Install frontend dependencies

```bash
cd frontend && npm install
```

### 4. Install gateway dependencies

```bash
cd gateway && npm install
```

---

## Development Workflow

The frontend and gateway run from source in separate terminals when the
Compose command above starts the backend. See the root README for the
alternative full-Compose workflow. Do not start a service through Compose
and from source on the same port.

### Frontend (explicitly run on port 3001)

```bash
cd frontend
# Copy the template to frontend/.env if needed; set NEXT_PUBLIC_API_URL to the gateway.
# The root setup section creates this file.

npm run dev -- -p 3001  # Next.js dev server with hot reload on port 3001
```

### Gateway (port 3000 by default)

```bash
cd gateway
# gateway/.env must exist (copied above)
npm run dev     # tsx watch — hot reload on file change
```

### Backend

The backend is included in Docker Compose and runs at `localhost:8080`. For local Maven development:

```bash
cd backend
# Requires running PostgreSQL and exported POSTGRES_*/JWT_SECRET values;
# the root .env is read by Compose, not automatically by Maven.
# Use docker compose up -d postgres redis, without the backend container.
./mvnw spring-boot:run
```

### Full local request flow

```
Browser (localhost:3001)
  → Gateway (localhost:3000/api/*)   ← JWT verified here
    → Backend (localhost:8080/api/*) ← Spring Security re-validates JWT
      → PostgreSQL (localhost:5432)
```

Public auth routes that bypass bearer JWT: `POST /api/auth/login`,
`POST /api/auth/register`, `POST /api/auth/refresh`, and
`POST /api/auth/logout`. Read-only forum and public-profile routes are also
listed in `gateway/src/config/index.ts`.

---

## Testing

### Run all tests (CI mode)

```bash
# Frontend
cd frontend && npm run test:coverage   # threshold: 65%

# Gateway
cd gateway && npm run test:coverage    # threshold: 65%

# Backend (requires running PostgreSQL — use docker compose up postgres)
cd backend && ./mvnw test
```

### Frontend tests (Vitest 3 + React Testing Library)

```bash
cd frontend
npm run test              # single run
npm run test:coverage     # with HTML + lcov coverage report

# Run a specific test file
npx vitest run src/services/__tests__/authService.test.ts

# Run tests matching a name pattern
npx vitest run -t "login"
```

Test files live in `__tests__/` subdirectories next to the module under test.  
Example: `src/services/__tests__/authService.test.ts` tests `src/services/authService.ts`.

Current Vitest coverage excludes: `app/`, `components/`, `hooks/`, `lib/`,
`utils/`, `shared/`, and `constants/`. Several of these contain executable
logic; their exclusion does not mean they are tested. PWDRZ-118 will review
the measured scope and threshold.

### Gateway tests (Jest 29 + ts-jest + supertest)

```bash
cd gateway
npm run test              # jest --coverage
npm run test:coverage     # same command, alias

# Run a specific test file
npx jest src/middleware/__tests__/auth.test.ts

# Run tests matching a pattern
npx jest --testNamePattern "should return 401"
```

Test files: `src/__tests__/` (top-level app/config) and `src/middleware/__tests__/` (per-middleware).

### Backend tests (JUnit 5 + Mockito + Spring Boot Test)

```bash
cd backend
./mvnw test                                              # all tests
./mvnw test -Dtest=AuthServiceTest                       # single class
./mvnw test -Dtest=AuthControllerTest#register_success   # single method
```

Test config: `src/test/resources/application-test.properties` — overrides datasource, disables Flyway, uses `create-drop` DDL.

Tests annotated with `@MigratedSchemaTest` (`com.devpulse.support`) are the exception: they apply the real Flyway migrations to a separate `migration_test` schema and run Hibernate `validate` against them. Use it for anything that depends on the real schema. When you map a new table or column (especially a PostgreSQL enum, which needs `@JdbcTypeCode(SqlTypes.NAMED_ENUM)`), add a round-trip case to `MigrationSchemaTest`; `create-drop` tests will not notice a mismatch with the migrations.

---

## Code Style

### TypeScript / TSX (frontend + gateway)

- **Formatter**: Prettier 3 — config in `frontend/.prettierrc` and `gateway/.prettierrc`
  - `semi: true`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: "es5"`, `printWidth: 100`, `endOfLine: "lf"`, `jsxSingleQuote: false`
- **Linter**: ESLint 9 (`eslint-config-next`) for frontend; ESLint 10 (`typescript-eslint`) for gateway

```bash
# Frontend
cd frontend
npm run lint          # eslint src
npm run format        # prettier --write .
npm run format:check  # prettier --check . (used as CI gate)
npm run typecheck     # tsc --noEmit

# Gateway
cd gateway
npm run lint          # eslint src
npm run lint:fix      # eslint src --fix
npm run format        # prettier --write src
npm run format:check  # prettier --check src (used as CI gate)
npm run typecheck     # tsc --noEmit
```

> Run the affected service's `format:check` and `lint` before submitting. Use
> `format` when a file needs formatting. The CI `lint` workflow enforces both
> checks on push to `main`/`develop` and on PRs. The [developer guides](docs/guides/README.md)
> own team conventions; this file is agent operating context.

### Java (backend)

- Standard Java conventions, PascalCase classes, camelCase methods/variables
- Lombok annotations (`@Data`, `@Builder`, `@RequiredArgsConstructor`, `@Slf4j`) used throughout
- Error responses follow RFC 9457 `ProblemDetail` (Spring 6 native) — do not return raw strings or custom error objects
- No Java formatter is currently configured. Follow the existing style in `com.devpulse.*`.

### Naming conventions

| Item | Convention | Example |
|------|-----------|---------|
| React component files | PascalCase `.tsx` | `PostCard.tsx` |
| Non-component TS files | camelCase `.ts` | `authService.ts`, `usePosts.ts` |
| TypeScript interfaces/types | PascalCase, no `I` prefix | `AuthResponse`, `User` |
| Zustand slices | camelCase, `Slice` suffix | `createAuthSlice`, `AuthSlice` |
| Java classes | PascalCase | `AuthController`, `JwtUtil` |
| Java packages | `com.devpulse.<domain>.<layer>` | `com.devpulse.auth.service` |

### Path alias (frontend only)

`@/*` maps to `frontend/src/*`. Example: `import type { User } from '@/shared/types'`.  
Defined in `frontend/tsconfig.json`. Always use `@/` for cross-module imports; relative imports only within the same folder.

---

## Project Structure

```
frontend/src/
  app/
    (auth)/        ← login, register pages (no header/sidebar)
    (main)/        ← home feed, forum, dashboard, profile (with Header + Sidebar)
    _components/   ← shared components used across pages (e.g. PostCard)
    layout.tsx     ← root layout, wraps everything in QueryProvider
  services/        ← API call functions (thin wrappers over ApiClient)
  store/slices/    ← Zustand slices: authSlice, uiSlice
  shared/types/    ← domain TypeScript types (User, Post, Comment, etc.)
  lib/validations/ ← Zod schemas for form validation
  components/      ← layout/ and ui/ reusable components
  providers/       ← React context providers (QueryProvider)
  constants/       ← static data (category list, nav items, mock content)

gateway/src/
  middleware/      ← auth, cors, rateLimiter, logger
  routes/          ← proxy.ts (proxies /api/* to backend)
  config/          ← env loading with validation
  types/           ← GatewayConfig, Express extensions

backend/src/main/java/com/devpulse/
  auth/            ← controller, service, repository, entity, dto, filter
  config/          ← SecurityConfig, OpenApiConfig
  exception/       ← AppException, GlobalExceptionHandler
  security/        ← JwtUtil (sign, verify, parse)

backend/src/main/resources/
  application.properties
  db/migration/    ← V1 (users), V2 (forum), V3 (notifications), V4 (analytics), V5 (refresh-token rotation)

docs/
  README.md        ← documentation map by audience and purpose
  codebase/        ← generated current-state reference (fixed seven-file layout)
  db-schema*.mmd   ← Mermaid ER diagrams (PNG viewing copies alongside)
  guides/README.md ← team contribution rules and Definition of Done
```

---

## Architecture Decisions to Know

1. **Dual JWT verification is intentional** — the gateway verifies the token before proxying, and Spring Security re-validates it as defence-in-depth. The same `JWT_SECRET` must be configured in both.

2. **Token storage** — the access token lives only in memory (`frontend/src/lib/tokenMemory.ts`). The refresh token is an `HttpOnly; SameSite=Strict` cookie (`/api/auth` path) set by the backend and never appears in a request or response body. On page load `AuthProvider` calls `POST /auth/refresh`, then `GET /users/me`. Never write tokens to `localStorage`/`sessionStorage`. Set `COOKIE_SECURE=false` for plain-HTTP local dev (Safari ignores `Secure` cookies on `http://localhost`).

3. **Forum feed is currently mocked** — `frontend/src/hooks/usePosts.ts` returns `MOCK_POSTS`, although `frontend/src/services/forumService.ts` has typed adapters and the backend implements `/api/forum/posts`. PWDRZ-81 owns connecting the feed; adjacent comment, vote, category, and tag endpoints still contain `501` stubs.

4. **Redis** — provisioned in Docker Compose, not yet wired in application code. It is reserved for future integration; the first use case has not been selected. Do not remove it or the `depends_on` from compose as a documentation cleanup.

5. **Socket.IO is installed in the gateway** but not yet connected to a server/client flow. It is reserved for a future real-time integration, which must reconcile the current Spring STOMP/WebSocket path. Do not remove the dependency as a documentation cleanup.

6. **Swagger UI** — available at `http://localhost:8080/swagger-ui.html` in development. It must be **disabled in production**. Check `OpenApiConfig.java` when adding new endpoints.

## Task Backlog Tracking

- The shared executable backlog lives in [docs/agent-task-backlog/pwdrz-jira-tasks.json](docs/agent-task-backlog/pwdrz-jira-tasks.json).
- Each issue keeps the original Jira payload plus a `localTracking` block for agent state.
- Use `localTracking.status` values `pending`, `in_progress`, `blocked`, and `done`.
- When you start a task, set `localTracking.status = in_progress`, fill `localTracking.owner`, and refresh `localTracking.updatedAt`.
- When you finish a task, set `localTracking.status = done`, refresh `localTracking.updatedAt`, and add a short note in `localTracking.notes`.
- Do not change the Jira payload when updating local status; the local tracking block is the execution record.
- If you need to resume work, read the backlog file first and continue from the first `pending` or `blocked` task that is relevant.

---

## Agent Commit Policy

**Never commit or push changes unless the user explicitly requests it in their prompt.**

- Make all file edits and run all verifications, then stop.
- Do not run `git add`, `git commit`, or `git push` unless the user's message contains an explicit instruction such as "commit", "push", or "create a PR".
- This applies to all automated workflows — finishing a task does not imply permission to commit.

---

## Pull Request Guidelines

Use the [Git workflow](docs/guides/git-workflow.md) for the approved branch,
commit, review, and merge policy and the [PR guide](docs/guides/pr-guidelines.md)
for description examples. New task branches use
`PWDRZ-<ticket>-short-description`; normal PRs target `develop`. Release,
hotfix, and exceptional stacked PRs have separate rules. Do not treat an old
branch name or this agent summary as proof of current GitHub ruleset
enforcement.

### Required checks before submitting

```bash
# Frontend
cd frontend && npm run typecheck && npm run lint && npm run format:check && npm run test

# Gateway
cd gateway && npm run typecheck && npm run lint && npm run format:check && npm run test

# Backend
cd backend && ./mvnw test
```

Every applicable Build, Lint, and Tests job must pass. Current test
configurations enforce 65% for frontend/gateway (all four metrics) and 65%
backend line coverage; PWDRZ-118 owns the threshold review. The `≥50%`
labels in the Tests workflow are stale labels, not the active gate. The
mandatory E2E gate is not yet configured; PWDRZ-117 owns it. Never report an
absent gate as passed.

---

## Common Gotchas

- **`NEXT_PUBLIC_API_URL` not set** → the API client falls back to `http://localhost:3000/api` during development; production builds require an explicit value. Set it in `frontend/.env`.
- **JWT_SECRET mismatch** → gateway returns 401 on every non-public request with no descriptive error. Check that `JWT_SECRET` in `gateway/.env` and in root `.env` (passed to backend via Docker Compose) are identical.
- **Flyway migration failure** → inspect the migration error and database state first. `docker compose down -v` deletes local PostgreSQL data; use it only when that data is disposable and a reset is intended.
- **`@/*` alias not resolving in tests** → Vitest resolves aliases via `resolve.alias` in `vitest.config.ts`. Do not use `tsconfig.json` paths alone — they must be mirrored in the vitest config.
- **Port conflicts** → Next.js defaults to port 3000, so run it with `-p 3001` while the gateway owns 3000. `NEXT_PUBLIC_API_URL` controls the API target, not the frontend listening port.
- **Coverage reports** → `coverage/` is already ignored at the repository root, and no frontend/gateway coverage files are currently tracked. Do not add generated reports to Git.
