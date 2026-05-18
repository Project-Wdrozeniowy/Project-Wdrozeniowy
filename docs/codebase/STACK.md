# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

This is a multi-service monorepo (manual, no workspace manager). Each service has its own runtime.

#### Frontend

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | TypeScript 5 + TSX | [frontend/tsconfig.json](../../frontend/tsconfig.json) |
| Runtime | Node.js (Next.js App Router) | [frontend/package.json](../../frontend/package.json) |
| Package manager | npm | [frontend/package-lock.json](../../frontend/package-lock.json) |
| Module/build system | Next.js 16 (Turbopack-compatible) | [frontend/package.json](../../frontend/package.json) |

#### Gateway

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | TypeScript 6 | [gateway/tsconfig.json](../../gateway/tsconfig.json) |
| Runtime | Node.js (CommonJS) | [gateway/package.json](../../gateway/package.json) |
| Package manager | npm | [gateway/package-lock.json](../../gateway/package-lock.json) |
| Module/build system | tsc → `dist/`, tsx for dev | [gateway/package.json](../../gateway/package.json) |

#### Backend

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | Java 17 | [backend/pom.xml](../../backend/pom.xml) |
| Runtime | JVM 17 (Temurin in CI) | [.github/workflows/backend-build.yml](../../.github/workflows/backend-build.yml) |
| Package manager | Maven (wrapper) | [backend/mvnw](../../backend/mvnw) |
| Module/build system | Maven + spring-boot-maven-plugin | [backend/pom.xml](../../backend/pom.xml) |

---

### 2) Production Frameworks and Dependencies

#### Frontend — `dependencies` only

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| next | 16.2.1 | Full-stack React framework (App Router, SSR/SSG) | [frontend/package.json](../../frontend/package.json) |
| react / react-dom | 19.2.4 | UI rendering | [frontend/package.json](../../frontend/package.json) |
| @tanstack/react-query | ^5.95.2 | Server-state management (data fetching, caching) | [frontend/package.json](../../frontend/package.json) |
| zustand | ^5.0.12 | Client-state management (auth, UI state) | [frontend/package.json](../../frontend/package.json) |
| axios | ^1.13.6 | HTTP client wrapper for API calls | [frontend/package.json](../../frontend/package.json) |
| react-hook-form | ^7.72.1 | Form state and validation | [frontend/package.json](../../frontend/package.json) |
| @hookform/resolvers | ^5.2.2 | Zod → react-hook-form bridge | [frontend/package.json](../../frontend/package.json) |
| zod | ^4.3.6 | Runtime schema validation (forms, types) | [frontend/package.json](../../frontend/package.json) |
| clsx | ^2.1.1 | Conditional class name utility (used via `cn()`) | [frontend/package.json](../../frontend/package.json) |

#### Gateway — `dependencies` only

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| express | ^5.2.1 | HTTP server framework | [gateway/package.json](../../gateway/package.json) |
| http-proxy-middleware | ^3.0.5 | Reverse-proxy to backend | [gateway/package.json](../../gateway/package.json) |
| jsonwebtoken | ^9.0.3 | JWT verification (access tokens) | [gateway/package.json](../../gateway/package.json) |
| helmet | ^8.1.0 | HTTP security headers | [gateway/package.json](../../gateway/package.json) |
| cors | ^2.8.6 | CORS policy enforcement | [gateway/package.json](../../gateway/package.json) |
| express-rate-limit | ^8.3.2 | API rate limiting | [gateway/package.json](../../gateway/package.json) |
| morgan | ^1.10.1 | HTTP request logging | [gateway/package.json](../../gateway/package.json) |
| cookie-parser | ^1.4.7 | Cookie parsing middleware | [gateway/package.json](../../gateway/package.json) |
| socket.io | ^4.8.1 | WebSocket server (installed, not yet wired in source) | [gateway/package.json](../../gateway/package.json) |
| dotenv | ^17.4.0 | Environment variable loading | [gateway/package.json](../../gateway/package.json) |

#### Backend — production scope (`compile`/`runtime`, excluding `test`)

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| spring-boot-starter-web | 4.0.4 (BOM) | REST API (Spring MVC) | [backend/pom.xml](../../backend/pom.xml) |
| spring-boot-starter-security | 4.0.4 | Authentication/authorization filter chain | [backend/pom.xml](../../backend/pom.xml) |
| spring-boot-starter-data-jpa | 4.0.4 | JPA/Hibernate ORM layer | [backend/pom.xml](../../backend/pom.xml) |
| spring-boot-starter-validation | 4.0.4 | Bean Validation (`@Valid`, JSR-380) | [backend/pom.xml](../../backend/pom.xml) |
| postgresql | (runtime) | JDBC driver for PostgreSQL 16 | [backend/pom.xml](../../backend/pom.xml) |
| flyway-core + flyway-database-postgresql | (BOM) | Database schema migration | [backend/pom.xml](../../backend/pom.xml) |
| jjwt-api / jjwt-impl / jjwt-jackson | 0.12.6 | JWT signing and parsing | [backend/pom.xml](../../backend/pom.xml) |
| springdoc-openapi-starter-webmvc-ui | 2.8.3 | Swagger UI / OpenAPI 3 docs | [backend/pom.xml](../../backend/pom.xml) |
| lombok | optional | Code generation (getters, constructors, logging) | [backend/pom.xml](../../backend/pom.xml) |

---

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| Prettier 3 | Code formatter (frontend + gateway) | [frontend/.prettierrc](../../frontend/.prettierrc), [gateway/.prettierrc](../../gateway/.prettierrc) |
| ESLint 9 / next config | Linting (frontend) | [frontend/eslint.config.mjs](../../frontend/eslint.config.mjs) |
| ESLint 10 / typescript-eslint | Linting (gateway) | [gateway/eslint.config.mjs](../../gateway/eslint.config.mjs) |
| Vitest 3 | Unit testing (frontend) | [frontend/vitest.config.ts](../../frontend/vitest.config.ts) |
| Jest 29 + ts-jest | Unit testing (gateway) | [gateway/jest.config.js](../../gateway/jest.config.js) |
| JUnit 5 + Spring Boot Test | Unit/integration testing (backend) | [backend/pom.xml](../../backend/pom.xml) |
| tailwindcss 4 (dev) | CSS utility classes | [frontend/package.json](../../frontend/package.json) |
| tsx | TypeScript runner for gateway dev mode | [gateway/package.json](../../gateway/package.json) |
| @tanstack/react-query-devtools | React Query browser devtools | [frontend/package.json](../../frontend/package.json) |

---

### 4) Key Commands

```bash
# Frontend
cd frontend && npm install
npm run dev           # Next.js dev server
npm run build         # Production build
npm run test          # Vitest unit tests
npm run test:coverage # Coverage (threshold: 65%)
npm run lint          # ESLint
npm run format        # Prettier write
npm run format:check  # Prettier check (used in CI)

# Gateway
cd gateway && npm install
npm run dev           # tsx watch (hot reload)
npm run build         # tsc → dist/
npm run test          # Jest with coverage
npm run lint          # ESLint
npm run format        # Prettier write

# Backend
cd backend
./mvnw spring-boot:run          # Run locally
./mvnw --batch-mode package     # Build JAR
./mvnw test                     # Run tests

# Docker (full stack)
docker compose up -d            # Postgres + Redis + Backend
```

---

### 5) Environment and Config

- Config sources: `.env.example` (root), `backend/.env`, `gateway/.env.example`, `frontend/.env`
- Required env vars:
  - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
  - `JWT_SECRET` (≥32 bytes Base64, shared by gateway and backend)
  - `JWT_ACCESS_EXPIRY` (default 900 s), `JWT_REFRESH_EXPIRY` (default 604800 s)
  - `REDIS_HOST`, `REDIS_PORT` (declared in root `.env.example`, not yet wired in app code)
  - `INTERNAL_SECRET` (declared in root `.env.example`, not yet used in code)
  - `BACKEND_URL` (gateway), `CORS_ORIGINS` (gateway)
  - `NEXT_PUBLIC_API_URL` (frontend — required in production)
- Deployment constraint: `JWT_SECRET` must be **identical** in gateway and backend configs; mismatch causes 401 on every request.

---

### 6) Evidence

- [frontend/package.json](../../frontend/package.json)
- [gateway/package.json](../../gateway/package.json)
- [backend/pom.xml](../../backend/pom.xml)
- [.env.example](../../.env.example)
- [gateway/.env.example](../../gateway/.env.example)
- [docker-compose.yml](../../docker-compose.yml)
- [.github/workflows/backend-build.yml](../../.github/workflows/backend-build.yml)
- [.github/workflows/test.yml](../../.github/workflows/test.yml)
