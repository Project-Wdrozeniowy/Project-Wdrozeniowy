# Orbita

[![Frontend Build](https://img.shields.io/github/actions/workflow/status/Project-Wdrozeniowy/Project-Wdrozeniowy/frontend-build.yml?style=flat-square&label=Frontend)](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions)
[![Gateway Build](https://img.shields.io/github/actions/workflow/status/Project-Wdrozeniowy/Project-Wdrozeniowy/gateway-build.yml?style=flat-square&label=Gateway)](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions)
[![Backend Build](https://img.shields.io/github/actions/workflow/status/Project-Wdrozeniowy/Project-Wdrozeniowy/backend-build.yml?style=flat-square&label=Backend)](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions)
[![Tests](https://img.shields.io/github/actions/workflow/status/Project-Wdrozeniowy/Project-Wdrozeniowy/test.yml?style=flat-square&label=Tests)](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions)

A full-stack community forum platform in development. Authentication, user-profile APIs,
and forum-post APIs are implemented; the forum feed still uses mock data, and comments,
votes, and real-time notifications are not yet complete end to end.

## Architecture

The repository contains three independent services wired through a shared Docker Compose stack:

```
Frontend (Next.js 16)       port 3001
       ↓
Gateway (Express 5)         port 3000   ← JWT verification, rate limiting, CORS
       ↓
Backend (Spring Boot 4)     port 8080   ← business logic, REST API
       ↓
PostgreSQL 16               port 5432
```

| Service | Stack |
|---------|-------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Zustand, React Query, Axios, Zod |
| **Gateway** | Node.js, Express 5, TypeScript 6, JWT, Helmet, express-rate-limit |
| **Backend** | Java 17, Spring Boot 4, Spring Security, Spring Data JPA, Flyway, jjwt |
| **Infra** | PostgreSQL 16, Redis 7 (Docker Compose) |

## Getting Started

### Prerequisites

- Node.js ≥ 24
- Java 17 (Temurin recommended)
- Docker + Docker Compose

### 1. Configure environment

```bash
# Root secrets — PostgreSQL credentials, shared JWT secret, Redis config
cp .env.example .env

# Gateway environment
cp gateway/.env.example gateway/.env

# Frontend API base URL
cp frontend/.env.example frontend/.env
```

Edit `.env` and set at minimum:

```bash
POSTGRES_PASSWORD=your_password

# Generate a strong secret:
# openssl rand -base64 64 | tr -d '\n'
JWT_SECRET=your_base64_secret
```

> [!IMPORTANT]
> Copy the same generated `JWT_SECRET` value into `gateway/.env`. The root `.env`
> supplies the Compose services; `gateway/.env` is used when running the gateway
> from source. A mismatch causes 401 on authenticated requests.

### 2. Start the infrastructure, backend, and gateway

```bash
docker compose up -d        # starts postgres, redis, backend, gateway
docker compose logs --tail=100 # inspect startup; Flyway runs migrations automatically
```

### 3. Install dependencies

From the repository root:

```bash
npm --prefix frontend install
npm --prefix gateway install
```

## Running Locally

Start each workflow from the repository root. Run long-lived services in separate
terminals. Choose one backend/gateway workflow so each port has one owner.

### Compose backend and gateway

```bash
# Starts postgres, redis, backend, and gateway.
docker compose up -d
```

In a separate terminal, start the frontend on `http://localhost:3001`:

```bash
cd frontend
npm run dev -- -p 3001
```

### Run backend and gateway from source

Terminal 1, from the repository root:

```bash
docker compose up -d postgres redis
```

Terminal 2, from the repository root (gateway on `http://localhost:3000`):

```bash
cd gateway
npm run dev
```

Terminal 3, from the repository root (backend on `http://localhost:8080`):

```bash
# Maven does not load the root .env automatically. Export the same values that
# Compose uses from .env before starting the backend.
export POSTGRES_DB=devpulse
export POSTGRES_USER=devpulse
export POSTGRES_PASSWORD='your_password_from_root_env'
export JWT_SECRET='your_base64_secret_from_root_env'
export COOKIE_SECURE=false
cd backend
./mvnw spring-boot:run
```

Terminal 4, from the repository root (frontend on `http://localhost:3001`):

```bash
cd frontend
npm run dev -- -p 3001
```

On Windows PowerShell, Terminal 3 uses the same values from the root `.env`:

```powershell
$env:POSTGRES_DB = 'devpulse'
$env:POSTGRES_USER = 'devpulse'
$env:POSTGRES_PASSWORD = 'your_password_from_root_env'
$env:JWT_SECRET = 'your_base64_secret_from_root_env'
$env:COOKIE_SECURE = 'false'
cd backend
.\mvnw.cmd spring-boot:run
```

If you changed the database name or user in the root `.env`, use those values here too.

## Testing

From the repository root, run each line independently:

```bash
# Frontend — Vitest 3.2.4 + Istanbul, service-specific coverage gates
npm --prefix frontend run test:coverage

# Gateway — Jest 29, service-specific coverage gates
npm --prefix gateway run test:coverage

# Backend — JUnit 5 + JaCoCo (requires a running PostgreSQL)
cd backend && ./mvnw verify
```

PWDRZ-118 selected independent lines, branches, functions and statements gates
for frontend and gateway. Frontend executable UI and hook code is included;
passing aggregate coverage does not prove every behaviour is tested.
See the [coverage policy](docs/guides/testing.md#coverage-policy-pwdrz-118)
for exact thresholds and source scope. Backend enforces independent JaCoCo
LINE ≥95% and BRANCH ≥85% gates at `verify`; METHOD/INSTRUCTION are diagnostic.
Browser and cross-service tests live in the independent [e2e package](e2e/README.md).
After its documented dependency/browser installation, `npm --prefix e2e test`
starts a separate real stack and runs the Chromium gate. It needs Docker and
does not use developer databases or `.env` files. See the
[testing guide](docs/guides/testing.md) and [PWDRZ-117 evidence](docs/agent-task-backlog/pwdrz-117-execution.md)
for scenario scope and the actual CI/required-check verification status.

Run a specific test from the relevant service directory (each block starts at the repository root):

```bash
cd frontend
npx vitest run src/shared/api/auth/__tests__/authClient.test.ts
npx vitest run -t "login"
```

```bash
cd gateway
npx jest src/middleware/__tests__/auth.test.ts
```

```bash
cd backend
./mvnw test -Dtest=AuthServiceTest
./mvnw test -Dtest=AuthControllerTest#registerRejectsABlankUsername
```

## Code Style

Both the frontend and gateway use **Prettier 3** and **ESLint**. Run the relevant checks from the repository root:

```bash
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run format:check
npm --prefix gateway run typecheck
npm --prefix gateway run lint
npm --prefix gateway run format:check
```

Formatter config: [`frontend/.prettierrc`](frontend/.prettierrc), [`gateway/.prettierrc`](gateway/.prettierrc)  
`semi: true` · `singleQuote: true` · `tabWidth: 2` · `printWidth: 100` · `endOfLine: lf`

The CI **Lint** workflow enforces `format:check` and `lint` on every push to `main`/`develop` and on all PRs.

## Project Structure

```
frontend/src/
  app/(auth)/          ← login, register (no header/sidebar)
  app/(main)/          ← home feed, forum, dashboard, profile
  services/            ← API call functions
  store/slices/        ← Zustand: authSlice, uiSlice
  shared/types/        ← domain TypeScript types
  lib/validations/     ← Zod schemas

gateway/src/
  middleware/          ← auth, cors, rateLimiter, logger
  routes/proxy.ts      ← proxies /api/* to backend
  config/              ← env loading with validation

backend/src/main/java/com/devpulse/
  auth/                ← controller, service, repository, entity, dto, filter
  config/              ← SecurityConfig, OpenApiConfig
  exception/           ← GlobalExceptionHandler (RFC 9457 ProblemDetail)
  security/            ← JwtUtil

backend/src/main/resources/db/migration/
  V1__create_users.sql
  V2__create_forum_tables.sql
  V3__create_notifications.sql
  V4__create_analytics_tables.sql
  V5__add_replaced_by_to_refresh_tokens.sql
```

Start with the [developer guides](docs/guides/README.md) for architecture,
naming, testing, Git and PR rules. The [documentation map](docs/README.md)
also points to the separate dated codebase reference and agent/tooling files.

## Pull Requests

- **Normal base branch**: `develop`; release promotion, hotfixes and exceptional
  stacked PRs follow the [Git workflow](docs/guides/git-workflow.md).
- **New task branch name**: `PWDRZ-<ticket>-short-description`
- **PR title**: `[PWDRZ-<n>]: Short imperative description`
- **Commit messages**: same format — `[PWDRZ-123]: Add login form validation`

Required checks before submitting:

From the repository root, run each line independently:

```bash
npm --prefix frontend run typecheck && npm --prefix frontend run lint && npm --prefix frontend run format:check && npm --prefix frontend run test && npm --prefix frontend run build
npm --prefix gateway run typecheck && npm --prefix gateway run lint && npm --prefix gateway run format:check && npm --prefix gateway run test && npm --prefix gateway run build
cd backend && ./mvnw verify
```

The `frontend/.env` created during setup supplies `NEXT_PUBLIC_API_URL` to
the local frontend build. CI supplies it as a workflow environment variable.

Every applicable CI check must pass before merge. The
[PR guide](docs/guides/pr-guidelines.md) explains what to include in the
description and how to report verification. GitHub rulesets are authoritative
for technical branch protection and merge restrictions; their current
enforcement must be checked rather than inferred from this README.

## Troubleshooting

**401 on every request** — `JWT_SECRET` in `gateway/.env` does not match the one in `.env`. They must be identical.

**Backend fails to start (Flyway error)** — inspect the migration error and
database state first. If this is disposable local data and you intentionally
want a fresh database, the following command deletes the Compose volumes:
```bash
docker compose down -v && docker compose up -d
```

**`@/*` import not resolving in tests** — the path alias is defined in both `frontend/tsconfig.json` and `frontend/vitest.config.ts`. Both must be present.

**`NEXT_PUBLIC_API_URL` missing** — browser requests fall back to `/api` on the
frontend origin, where this project has no proxy rewrite. Set the variable to
`http://localhost:3000/api` for local development. Server-side development code
falls back to that URL; production server-side code requires the variable.

## License and ownership

Proprietary — All rights reserved.

This is a private educational project with potential commercial use.
No permission is granted to use, copy, modify, distribute, or publish its
source code or related materials without written consent from all copyright
holders listed in [NOTICE.md](NOTICE.md).

## License and ownership

Proprietary — All rights reserved.

This is a private educational project with potential commercial use.
No permission is granted to use, copy, modify, distribute, or publish its
source code or related materials without written consent from all copyright
holders listed in [NOTICE](NOTICE).

See [LICENSE](LICENSE) for terms.
