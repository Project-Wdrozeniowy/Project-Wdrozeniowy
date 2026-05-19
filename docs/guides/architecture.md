# Architecture

## Monorepo layout

```
.
├── backend/      Spring Boot 4 REST API (Java 17, Maven)
├── frontend/    Next.js 16 App Router (React 19, TypeScript, Tailwind v4)
├── gateway/     Express 5 API gateway (TypeScript, Node 24)
├── docs/        Database ER diagrams (Mermaid) and existing guides
├── shared/docs/ Engineering conventions (this folder)
├── docker-compose.yml
├── .env.example
└── .github/workflows/  CI pipelines
```

Each workspace owns its own `package.json` / `pom.xml`, its own lint config, and
its own test runner. There is **no** shared TypeScript package today; types are
duplicated between frontend and gateway and validated by integration tests.

## Module responsibilities

### `backend/` — Spring Boot REST API

- Package root: `com.devpulse`
- One top-level package per bounded context:
  - `auth/` — registration, login, JWT, refresh tokens, role/user entity
  - `user/` — profile read/update, change password
  - `forum/` — posts, categories, search
  - `admin/` — staff-only endpoints
  - `config/` — Spring beans (security, OpenAPI, ...)
  - `security/` — JWT plumbing (token signing & parsing)
  - `exception/` — `AppException` + `GlobalExceptionHandler` (RFC 9457 ProblemDetail)
- Each context follows the layout:
  ```
  <context>/
    controller/   REST controllers (@RestController, @RequestMapping)
    service/      Business logic (@Service, @Transactional)
    repository/   Spring Data JPA interfaces
    entity/       JPA entities + enums
    dto/          Request / response payloads
    util/         Small helpers
    security/     Context-specific authorization helpers
  ```
- Database access is JPA only. Migrations live in
  `backend/src/main/resources/db/migration/` with `V{N}__description.sql`
  Flyway naming.

### `frontend/` — Next.js App Router

- App Router under `src/app/`
- Cross-cutting code under `src/`:
  ```
  app/         routes (layout.tsx, page.tsx)
  components/  reusable React components (PascalCase)
  services/    API client (axios singleton) + per-resource service files
  store/       Zustand store; slices in store/slices/
  providers/   React context providers (QueryProvider, ...)
  types/       Shared TypeScript types (single index.ts re-export)
  test/        Vitest setup (jsdom + RTL)
  ```
- Axios singleton in `src/services/api.ts` injects `Authorization: Bearer …`
  from `localStorage` and redirects to `/login` on 401.

### `gateway/` — Express API gateway

- Sits in front of the backend; handles CORS, rate limiting, auth verification
  before proxying.
- Folder layout:
  ```
  src/
    app.ts          Express app wiring
    index.ts        Server bootstrap
    config/         Environment config
    middleware/     auth, logger, rateLimiter, cors, ...
    routes/         Route handlers / proxy targets
    types/          TypeScript types
    __tests__/      Jest tests
    test/           Test setup
  ```
- Middleware order: `helmet` → CORS → rate limit → request logger → JWT auth
  → proxy. The `/health` endpoint is mounted **before** auth.

## Request flow

```
Browser ──HTTPS──▶  Frontend (Next.js, :3000)
                          │
                          ▼ axios (Bearer JWT)
Frontend ──HTTP──▶  Gateway (Express, :3001)
                          │ verifies JWT, enforces rate limits
                          ▼ HTTP + INTERNAL_SECRET header
Gateway  ──HTTP──▶  Backend (Spring Boot, :8080)
                          │ JPA / JDBC
                          ▼
                       PostgreSQL (+ Redis for caching)
```

The frontend never talks to the backend directly in production. Local
development is the only place where the gateway can be bypassed.

## Configuration

- Environment is supplied through `.env`; copy from `.env.example`.
- `JWT_SECRET` must be a base64 string of **at least 32 bytes**.
- `JWT_ACCESS_EXPIRY` (seconds, default 900) and `JWT_REFRESH_EXPIRY`
  (seconds, default 604800) are tuneable.
- `INTERNAL_SECRET` is shared between gateway and backend so the backend can
  recognise pre-authorised gateway calls.

## When to add a new module

Open a new top-level package / folder only when a feature owns at least a
controller + service + repository (backend), a page + service file (frontend)
or a route + middleware (gateway). Otherwise extend an existing context.
