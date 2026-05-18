# AGENTS.md

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

Database schema is managed by Flyway (4 migrations: users, forum, notifications, analytics).  
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

# Edit .env — the only required change before running locally:
# POSTGRES_PASSWORD=<any password>
# JWT_SECRET=<base64-encoded string, at least 32 bytes>
#   Generate: openssl rand -base64 64 | tr -d '\n'
```

> **Critical**: `JWT_SECRET` must be **identical** in root `.env` (used by backend via Docker Compose)
> and in `gateway/.env`. A mismatch causes 401 on every authenticated request.

### 2. Start the database and backend via Docker Compose

```bash
docker compose up -d        # starts postgres, redis, backend
docker compose logs -f      # watch startup
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

All three services run independently. Start them in separate terminals.

### Frontend (port 3001 by default)

```bash
cd frontend
# Create frontend/.env if not present:
echo "NEXT_PUBLIC_API_URL=http://localhost:3000/api" > .env

npm run dev     # Next.js dev server with hot reload
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
# Requires a running PostgreSQL (use docker compose up postgres)
./mvnw spring-boot:run
```

### Full local request flow

```
Browser (localhost:3001)
  → Gateway (localhost:3000/api/*)   ← JWT verified here
    → Backend (localhost:8080/api/*) ← Spring Security re-validates JWT
      → PostgreSQL (localhost:5432)
```

Public routes that bypass JWT: `POST /api/auth/login`, `POST /api/auth/register`

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

Coverage excludes: `app/`, `components/`, `hooks/`, `types/`, `constants/` (UI/static — no executable logic).

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

> Always run `format` and `lint` before committing. The CI `lint` workflow enforces `format:check` and `lint` on push to `main`/`develop` and on all PRs.

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
  db/migration/    ← V1 (users), V2 (forum), V3 (notifications), V4 (analytics)

docs/
  codebase/        ← generated reference docs (STACK, STRUCTURE, ARCHITECTURE, etc.)
  db-schema*.mmd   ← Mermaid ER diagrams
  guides/          ← branch naming, PR description guides
```

---

## Architecture Decisions to Know

1. **Dual JWT verification is intentional** — the gateway verifies the token before proxying, and Spring Security re-validates it as defence-in-depth. The same `JWT_SECRET` must be configured in both.

2. **Token storage direction** — the current implementation stores the JWT in `localStorage`. The intended direction is `httpOnly` cookies. Do not introduce new code that further cements the `localStorage` approach.

3. **Forum data is currently mocked** — `frontend/src/services/forumService.ts` returns static fixtures. The `/api/posts` endpoint does not exist in the backend yet. Backend forum endpoints are in the backlog.

4. **Redis** — provisioned in Docker Compose, not yet wired in application code. It will be used for caching and/or session management. Do not remove it or the `depends_on` from compose.

5. **Socket.IO is installed in the gateway** but not yet connected to any route. It will be used for real-time forum notifications (new replies, votes, mentions). Do not remove the dependency.

6. **Swagger UI** — available at `http://localhost:8080/swagger-ui.html` in development. It must be **disabled in production**. Check `OpenApiConfig.java` when adding new endpoints.

---

## Agent Commit Policy

**Never commit or push changes unless the user explicitly requests it in their prompt.**

- Make all file edits and run all verifications, then stop.
- Do not run `git add`, `git commit`, or `git push` unless the user's message contains an explicit instruction such as "commit", "push", or "create a PR".
- This applies to all automated workflows — finishing a task does not imply permission to commit.

---

## Pull Request Guidelines

- **Branch name**: `type/PWDRZ-<ticket>-short-description`
  - Types: `feature`, `bugfix`, `hotfix`
  - Example: `feature/PWDRZ-30-forum-post-list`
- **Base branch**: `develop` (not `main`)
- **PR title**: `[PWDRZ-<n>]: Short imperative description`
  - Example: `[PWDRZ-30]: Add forum post list endpoint`
- **Commit messages**: same format as PR title — `[PWDRZ-123]: Add login form validation`

### Required checks before submitting

```bash
# Frontend
cd frontend && npm run typecheck && npm run lint && npm run format:check && npm run test

# Gateway
cd gateway && npm run typecheck && npm run lint && npm run format:check && npm run test

# Backend
cd backend && ./mvnw test
```

All three CI workflows must pass: **Build**, **Lint**, and **Tests** (≥65% coverage for frontend/gateway, ≥50% for backend).

---

## Common Gotchas

- **`NEXT_PUBLIC_API_URL` not set** → frontend falls back to `http://localhost:3000/api` in dev and throws at build time in production. Always set it in `frontend/.env`.
- **JWT_SECRET mismatch** → gateway returns 401 on every non-public request with no descriptive error. Check that `JWT_SECRET` in `gateway/.env` and in root `.env` (passed to backend via Docker Compose) are identical.
- **Flyway migration failure** → if the backend fails to start with a Flyway error, the most common cause is a stale local database state. Run `docker compose down -v && docker compose up -d` to reset.
- **`@/*` alias not resolving in tests** → Vitest resolves aliases via `resolve.alias` in `vitest.config.ts`. Do not use `tsconfig.json` paths alone — they must be mirrored in the vitest config.
- **Port conflicts** → frontend dev server defaults to port 3001 (set via `NEXT_PUBLIC_API_URL` pointing to gateway at 3000); gateway defaults to 3000. If you change ports, update both env files.
- **Coverage reports in git** → `frontend/coverage/` and `gateway/coverage/` are currently tracked in the repository. Do not commit new coverage artifacts. This will be addressed by adding them to `.gitignore`.
