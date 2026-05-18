# Orbita

[![Frontend Build](https://img.shields.io/github/actions/workflow/status/Project-Wdrozeniowy/Project-Wdrozeniowy/frontend-build.yml?style=flat-square&label=Frontend)](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions)
[![Gateway Build](https://img.shields.io/github/actions/workflow/status/Project-Wdrozeniowy/Project-Wdrozeniowy/gateway-build.yml?style=flat-square&label=Gateway)](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions)
[![Backend Build](https://img.shields.io/github/actions/workflow/status/Project-Wdrozeniowy/Project-Wdrozeniowy/backend-build.yml?style=flat-square&label=Backend)](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions)
[![Tests](https://img.shields.io/github/actions/workflow/status/Project-Wdrozeniowy/Project-Wdrozeniowy/test.yml?style=flat-square&label=Tests)](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions)

A full-stack community forum platform where users can register, post articles, comment, vote, and receive real-time notifications.

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
```

Edit `.env` and set at minimum:

```bash
POSTGRES_PASSWORD=your_password

# Generate a strong secret:
# openssl rand -base64 64 | tr -d '\n'
JWT_SECRET=your_base64_secret
```

> [!IMPORTANT]
> `JWT_SECRET` must be **identical** in `.env` and `gateway/.env`. A mismatch causes 401 on every authenticated request with no descriptive error.

### 2. Start the database and backend

```bash
docker compose up -d        # starts postgres, redis, backend
docker compose logs -f      # watch startup; Flyway runs migrations automatically
```

### 3. Install dependencies

```bash
cd frontend && npm install
cd ../gateway && npm install
```

## Running Locally

Start each service in a separate terminal:

```bash
# Frontend — http://localhost:3001
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3000/api" > .env
npm run dev

# Gateway — http://localhost:3000
cd gateway
npm run dev

# Backend is already running via Docker Compose (port 8080)
# To run with Maven directly (requires postgres running):
cd backend && ./mvnw spring-boot:run
```

## Testing

```bash
# Frontend — Vitest 3, coverage threshold: 65%
cd frontend && npm run test:coverage

# Gateway — Jest 29, coverage threshold: 65%
cd gateway && npm run test:coverage

# Backend — JUnit 5 (requires a running PostgreSQL)
cd backend && ./mvnw test
```

Run a specific test:

```bash
# Frontend
npx vitest run src/services/__tests__/authService.test.ts
npx vitest run -t "login"

# Gateway
npx jest src/middleware/__tests__/auth.test.ts

# Backend
./mvnw test -Dtest=AuthServiceTest
./mvnw test -Dtest=AuthControllerTest#register_success
```

## Code Style

Both the frontend and gateway use **Prettier 3** and **ESLint**. Always run these before committing:

```bash
# Frontend
cd frontend
npm run typecheck && npm run lint && npm run format:check

# Gateway
cd gateway
npm run typecheck && npm run lint && npm run format:check
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
```

Detailed architecture and conventions are documented in [`docs/codebase/`](docs/codebase/).

## Pull Requests

- **Base branch**: `develop`
- **Branch name**: `type/PWDRZ-<ticket>-short-description`  
  Types: `feature`, `bugfix`, `hotfix`
- **PR title**: `[PWDRZ-<n>]: Short imperative description`
- **Commit messages**: same format — `[PWDRZ-123]: Add login form validation`

Required checks before submitting:

```bash
cd frontend && npm run typecheck && npm run lint && npm run format:check && npm run test
cd gateway  && npm run typecheck && npm run lint && npm run format:check && npm run test
cd backend  && ./mvnw test
```

## Troubleshooting

**401 on every request** — `JWT_SECRET` in `gateway/.env` does not match the one in `.env`. They must be identical.

**Backend fails to start (Flyway error)** — stale database state. Reset with:
```bash
docker compose down -v && docker compose up -d
```

**`@/*` import not resolving in tests** — the path alias is defined in both `frontend/tsconfig.json` and `frontend/vitest.config.ts`. Both must be present.

**`NEXT_PUBLIC_API_URL` missing** — the frontend falls back to `http://localhost:3000/api` in development. In production this variable is required; the build will throw at startup if it is not set.

# Project-Wdrozeniowy