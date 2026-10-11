# Codebase Structure

> Snapshot scope: verified against the repository tree and entry configuration on 2026-10-11. This is a manual multi-project repository; root task orchestration is tracked separately. The table below describes existing files, not the approved extension rules in the [developer architecture guide](../guides/architecture.md).

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `frontend/` | Next.js 16 App Router application — UI, routing, client auth | [frontend/package.json](../../frontend/package.json) |
| `gateway/` | Node.js/Express reverse proxy — JWT verification, rate limiting, CORS, proxying to backend | [gateway/src/app.ts](../../gateway/src/app.ts) |
| `backend/` | Spring Boot REST API — business logic, auth endpoints, DB persistence | [backend/src/main/java/com/devpulse/](../../backend/src/main/java/com/devpulse/) |
| `docs/` | Developer guides, dated codebase reference, ER diagrams and agent backlog | [docs/README.md](../../docs/README.md) |
| `docker-compose.yml` | Orchestrates PostgreSQL 16, Redis 7, backend, and gateway; frontend runs separately | [docker-compose.yml](../../docker-compose.yml) |
| `.github/workflows/` | CI pipelines: build, lint, and test for each service | [.github/workflows/](../../.github/workflows/) |
| `.env.example` | Root-level env template for shared secrets | [.env.example](../../.env.example) |
| `AGENTS.md` | AI-agent instructions, including repository workflow and testing expectations | [AGENTS.md](../../AGENTS.md) |

---

### 2) Entry Points

#### Frontend
- **Main runtime entry**: [frontend/src/app/layout.tsx](../../frontend/src/app/layout.tsx) — root layout, wraps pages in `QueryProvider` and `AuthProvider`, and mounts `ToastProvider`
- **Auth pages**: `frontend/src/app/(auth)/login/` and `(auth)/register/`
- **Main app pages**: `frontend/src/app/(main)/` — home feed, forum, dashboard, profile
- **How selected**: Next.js App Router file-system routing; route groups `(auth)` and `(main)` group layouts without URL segments

#### Gateway
- **Main runtime entry**: [gateway/src/index.ts](../../gateway/src/index.ts) — creates HTTP server, binds to `PORT`
- **App assembly**: [gateway/src/app.ts](../../gateway/src/app.ts) — wires all middleware and routes

#### Backend
- **Main runtime entry**: [backend/src/main/java/com/devpulse/BackendApplication.java](../../backend/src/main/java/com/devpulse/BackendApplication.java) — `@SpringBootApplication` bootstrap

---

### 3) Observed Module Layout

#### Frontend

| Boundary | What is currently found here |
|----------|------------------------------|
| `src/app/` | Route files, layouts, route-local components; login/register pages also contain submit orchestration |
| `src/services/` | API wrappers and shared `ApiClient` |
| `src/store/` | Zustand auth and UI slices; access token itself lives in `src/lib/tokenMemory.ts` |
| `src/components/` | Reusable layout, guard and UI components |
| `src/shared/types/` | Hand-maintained domain/API TypeScript types |
| `src/lib/validations/` | Zod schemas for form input validation |
| `src/providers/` | Query, auth and toast providers; `AuthProvider` orchestrates session restoration |
| `src/constants/` | Static and mock data |
| `src/hooks/` | React Query/custom hooks, including mock-backed `usePosts` |

#### Gateway

| Boundary | What is currently found here |
|----------|------------------------------|
| `src/middleware/` | Express auth, CORS, rate-limit, logger and error middleware |
| `src/routes/` | HTTP and WebSocket proxy routing |
| `src/config/` | Environment-variable loading, defaults and public-route list |
| `src/types/` | TypeScript interfaces for config and Express extensions |

#### Backend

| Boundary | What is currently found here |
|----------|------------------------------|
| `com.devpulse.auth.controller/` | REST request/response mapping |
| `com.devpulse.auth.service/` | Registration, login and refresh operations |
| `com.devpulse.auth.repository/` | Spring Data JPA repositories |
| `com.devpulse.auth.entity/` | JPA entities and auth enums |
| `com.devpulse.auth.dto/` | Request/response DTOs |
| `com.devpulse.auth.filter/` | Spring Security JWT filter |
| `com.devpulse.security/` | JWT utility (sign, verify, parse) |
| `com.devpulse.config/` | Spring configuration beans |
| `com.devpulse.exception/` | Global exception handler |
| `resources/db/migration/` | Flyway SQL migrations |

---

### 4) Naming and Organization Observed

#### TypeScript (frontend + gateway)
- **File naming**: PascalCase for React components (`.tsx`), camelCase for services/hooks/utils (`.ts`)
  - Examples: `PostCard.tsx`, `authService.ts`, `usePosts.ts`, `format.ts`
- **Directory organization**: feature/role hybrid — `services/`, `store/slices/`, `components/layout/`, `components/ui/`, `app/(main)/forum/`
- **Import alias**: `@/*` maps to `frontend/src/*` (configured in [frontend/tsconfig.json](../../frontend/tsconfig.json)); gateway uses relative imports only
- **Test files**: usually placed in `__tests__/` subdirectories near their source

#### Java (backend)
- **File naming**: PascalCase for all Java classes, matching class name
  - Examples: `AuthController.java`, `JwtUtil.java`, `GlobalExceptionHandler.java`
- **Directory organization**: domain-first (`auth/`), then layer (`controller/`, `service/`, `repository/`, `entity/`, `dto/`, `filter/`)

---

### 5) Evidence

- [frontend/src/app/layout.tsx](../../frontend/src/app/layout.tsx)
- [gateway/src/app.ts](../../gateway/src/app.ts)
- [backend/src/main/java/com/devpulse/BackendApplication.java](../../backend/src/main/java/com/devpulse/BackendApplication.java)
- [frontend/tsconfig.json](../../frontend/tsconfig.json)
- [docs/codebase/.codebase-scan.txt](../../docs/codebase/.codebase-scan.txt) — directory tree section

## Extended Section: Frontend Route Structure

```
frontend/src/app/
  layout.tsx                     ← root layout (QueryProvider, AuthProvider, ToastProvider)
  globals.css
  (auth)/
    layout.tsx                   ← auth-only layout (no header/sidebar)
    login/
    register/
  (main)/
    layout.tsx                   ← main layout (Header + Sidebar)
    page.tsx                     ← home feed
    (protected)/
      layout.tsx                 ← protected/role-gated layout
      admin/
      dashboard/
      profile/
    forum/
      _components/CategoryFilter.tsx
  _components/
    PostCard.tsx                 ← shared post display component
```

## Extended Section: Backend Package Structure

```
com.devpulse/
  BackendApplication.java
  auth/
    controller/AuthController.java
    dto/            (AuthRequest, AuthResponse, RegisterRequest)
    entity/         (User, Role, RefreshToken)
    filter/         (JwtAuthenticationFilter)
    repository/     (UserRepository, RefreshTokenRepository)
    service/        (AuthService, UserDetailsServiceImpl)
  config/
    SecurityConfig.java
    OpenApiConfig.java
  exception/
    AppException.java
    GlobalExceptionHandler.java
  security/
    JwtUtil.java
  forum/                         ← post implementation plus controller contracts for adjacent forum features
  user/                          ← profile and password-management API
  notification/, analytics/, ai/, recommendation/, websocket/
                                  ← controller contracts; some endpoints return 501
```
