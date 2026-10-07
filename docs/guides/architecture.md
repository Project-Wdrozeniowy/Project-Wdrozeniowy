# Architecture

## Monorepo layout

```
.
├── backend/      Spring Boot 4 REST API (Java 17, Maven)
├── frontend/     Next.js 16 App Router (React 19, TypeScript, Tailwind v4)
├── gateway/      Express 5 API gateway (TypeScript, Node 24)
├── docs/         Conventions (guides/), generated reference docs (codebase/), ER diagrams
├── docker-compose.yml
├── .env.example
└── .github/workflows/  CI pipelines
```

Each workspace owns its own `package.json` / `pom.xml`, its own lint config, and
its own test runner. There is **no** shared TypeScript package; the frontend
types in `frontend/src/shared/types` mirror the backend's API contract by hand.

## Module responsibilities

### `backend/` — Spring Boot REST API

- Package root: `com.devpulse`, served under the `/api` context path.
- One top-level package per bounded context:
  - `auth/` — registration, login, JWT, refresh tokens, `User` and `Role`
  - `user/` — own and public profiles, password change
  - `forum/` — posts, tags, comments, categories, votes
  - `admin/` — staff-only endpoints
  - `common/` — shared DTOs such as `PagedResponse`
  - `config/` — Spring beans (security, OpenAPI, WebSocket)
  - `security/` — JWT plumbing (token signing & parsing)
  - `exception/` — `AppException` + `GlobalExceptionHandler` (RFC 9457 ProblemDetail)
  - `ai/`, `analytics/`, `notification/`, `recommendation/`, `websocket/` — API
    contract stubs that answer 501 until implemented
- Each context follows the layout:
  ```
  <context>/
    controller/   REST controllers (@RestController, @RequestMapping)
    service/      Business logic (@Service, @Transactional)
    repository/   Spring Data JPA interfaces
    entity/       JPA entities + enums
    dto/          Request / response payloads (the API contract)
    util/         Small helpers
    security/     Context-specific authorization helpers
  ```
- Database access is JPA only. The schema belongs to Flyway: migrations live in
  `backend/src/main/resources/db/migration/` (`V{N}__description.sql`), run on
  startup, and Hibernate only validates against them.

### `frontend/` — Next.js App Router

- App Router under `src/app/`, with route groups `(auth)` (login, register)
  and `(main)` (pages with header and sidebar).
- Cross-cutting code under `src/`:
  ```
  app/         routes (layout.tsx, page.tsx) and route-local _components/
  components/  reusable React components (PascalCase)
  hooks/       React Query hooks (usePosts, ...)
  services/    API client (axios singleton in api.ts) + per-resource service files
  store/       Zustand store; slices in store/slices/
  providers/   React context providers (QueryProvider, ...)
  shared/      Shared TypeScript types (shared/types/index.ts)
  lib/         Small helpers (cn, validation schemas, ...)
  utils/       Formatting helpers
  constants/   Static data
  test/        Vitest setup (jsdom + RTL)
  ```
- All HTTP calls go through the axios singleton in `src/services/api.ts`, which
  attaches the access token and handles 401 responses.

### `gateway/` — Express API gateway

- Sits in front of the backend; handles security headers, CORS, rate limiting
  and JWT verification before proxying.
- Folder layout:
  ```
  src/
    app.ts          Express app wiring
    index.ts        Server bootstrap
    config/         Environment config (incl. the public route list)
    middleware/     auth, cors, logger, rateLimiter, errorHandler
    routes/         proxy.ts (HTTP) and wsProxy.ts (WebSocket)
    types/          TypeScript types
    __tests__/      Jest tests (plus feature-local __tests__/ folders)
    test/           Test setup
  ```
- Middleware order (`app.ts`): `helmet` → CORS → access/error loggers → rate
  limit → `/health` → JWT auth on `/api` (skipped for the public routes in
  `config/`) → HTTP proxy → WebSocket proxy → 404 → error handler.

## Request flow

```
Browser
   │
   ▼
Frontend (Next.js, :3001)
   │ axios, Authorization: Bearer <access token>
   ▼
Gateway (Express, :3000)  ── verifies the JWT (except public routes), rate limits
   │ HTTP
   ▼
Backend (Spring Boot, :8080, context path /api)  ── re-validates the JWT
   │ JPA / JDBC
   ▼
PostgreSQL 16   (Redis 7 is provisioned but not used yet)
```

The frontend never talks to the backend directly. The JWT is verified twice on
purpose: the gateway rejects bad tokens early, and Spring Security re-validates
them as defence in depth.

## Configuration

- Environment is supplied through `.env`; copy from `.env.example`.
- `JWT_SECRET` must be a base64 string of **at least 32 bytes** and identical
  for the gateway and the backend.
- `JWT_ACCESS_EXPIRY` (seconds, default 900) and `JWT_REFRESH_EXPIRY`
  (seconds, default 604800) are tuneable.
- `INTERNAL_SECRET` is reserved for backend-to-gateway event dispatch, which is
  not implemented yet.

## When to add a new module

Open a new top-level package / folder only when a feature owns at least a
controller + service + repository (backend), a page + service file (frontend)
or a route + middleware (gateway). Otherwise extend an existing context.
