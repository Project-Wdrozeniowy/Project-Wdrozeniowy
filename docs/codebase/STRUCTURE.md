# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `frontend/` | Next.js 16 App Router SPA — UI, routing, client auth | [frontend/package.json](../../frontend/package.json) |
| `gateway/` | Node.js/Express reverse proxy — JWT verification, rate limiting, CORS, proxying to backend | [gateway/src/app.ts](../../gateway/src/app.ts) |
| `backend/` | Spring Boot REST API — business logic, auth endpoints, DB persistence | [backend/src/main/java/com/devpulse/](../../backend/src/main/java/com/devpulse/) |
| `docs/` | Architecture diagrams (Mermaid + PNG), developer guides | [docs/guides/](../../docs/guides/) |
| `docker-compose.yml` | Orchestrates PostgreSQL 16, Redis 7, and the backend service | [docker-compose.yml](../../docker-compose.yml) |
| `.github/workflows/` | CI pipelines: build, lint, and test for each service | [.github/workflows/](../../.github/workflows/) |
| `.env.example` | Root-level env template for shared secrets | [.env.example](../../.env.example) |
| `AGENTS.md` | AI agent instructions file (currently empty) | [AGENTS.md](../../AGENTS.md) |

---

### 2) Entry Points

#### Frontend
- **Main runtime entry**: [frontend/src/app/layout.tsx](../../frontend/src/app/layout.tsx) — root layout, wraps all pages in `QueryProvider`
- **Auth pages**: `frontend/src/app/(auth)/login/` and `(auth)/register/`
- **Main app pages**: `frontend/src/app/(main)/` — home feed, forum, dashboard, profile
- **How selected**: Next.js App Router file-system routing; route groups `(auth)` and `(main)` group layouts without URL segments

#### Gateway
- **Main runtime entry**: [gateway/src/index.ts](../../gateway/src/index.ts) — creates HTTP server, binds to `PORT`
- **App assembly**: [gateway/src/app.ts](../../gateway/src/app.ts) — wires all middleware and routes

#### Backend
- **Main runtime entry**: [backend/src/main/java/com/devpulse/BackendApplication.java](../../backend/src/main/java/com/devpulse/BackendApplication.java) — `@SpringBootApplication` bootstrap

---

### 3) Module Boundaries

#### Frontend

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `src/app/` | Page components, layouts, route groups | Business logic, direct API calls |
| `src/services/` | API call functions (thin wrappers over `apiClient`) | UI rendering, state management |
| `src/store/` | Zustand slices (auth, UI state) | API calls, component rendering |
| `src/components/` | Shared/reusable UI components (`layout/`, `ui/`) | Route-specific page logic |
| `src/shared/types/` | Shared TypeScript types (domain models, API shapes) | Runtime logic |
| `src/lib/validations/` | Zod schemas for form input validation | Component rendering |
| `src/providers/` | React context / library providers (QueryProvider) | Business logic |
| `src/constants/` | Static data (categories, nav items, mock content) | Dynamic state |
| `src/hooks/` | Custom React hooks | Non-React logic |

#### Gateway

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `src/middleware/` | Express middleware (auth, cors, rate-limit, logger) | Business logic, DB calls |
| `src/routes/` | Proxy routing configuration | Auth logic |
| `src/config/` | Environment-variable loading and defaults | Runtime decisions |
| `src/types/` | TypeScript interfaces for config and Express extensions | Implementation |

#### Backend

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `com.devpulse.auth.controller/` | REST controllers (HTTP request/response mapping) | Business logic |
| `com.devpulse.auth.service/` | Business logic (register, login, refresh) | HTTP/persistence concerns |
| `com.devpulse.auth.repository/` | Spring Data JPA repositories | Business logic |
| `com.devpulse.auth.entity/` | JPA entities (User, Role, RefreshToken) | Business logic |
| `com.devpulse.auth.dto/` | Request/response DTOs | Entities, business logic |
| `com.devpulse.auth.filter/` | Spring Security JWT filter | Business logic |
| `com.devpulse.security/` | JWT utility (sign, verify, parse) | HTTP handlers |
| `com.devpulse.config/` | Spring configuration beans (SecurityConfig, OpenApiConfig) | Business logic |
| `com.devpulse.exception/` | Global exception handler (`@RestControllerAdvice`) | Business logic |
| `resources/db/migration/` | Flyway SQL migration scripts | Application code |

---

### 4) Naming and Organization Rules

#### TypeScript (frontend + gateway)
- **File naming**: PascalCase for React components (`.tsx`), camelCase for services/hooks/utils (`.ts`)
  - Examples: `PostCard.tsx`, `authService.ts`, `usePosts.ts`, `format.ts`
- **Directory organization**: feature/role hybrid — `services/`, `store/slices/`, `components/layout/`, `components/ui/`, `app/(main)/forum/`
- **Import alias**: `@/*` maps to `frontend/src/*` (configured in [frontend/tsconfig.json](../../frontend/tsconfig.json)); gateway uses relative imports only
- **Test files**: placed in `__tests__/` subdirectory alongside the module they test

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
  layout.tsx                     ← root layout (QueryProvider)
  globals.css
  (auth)/
    layout.tsx                   ← auth-only layout (no header/sidebar)
    login/
    register/
  (main)/
    layout.tsx                   ← main layout (Header + Sidebar)
    page.tsx                     ← home feed
    dashboard/
    forum/
      _components/CategoryFilter.tsx
    profile/
      _components/ProfileTabs.tsx
  _components/
    PostCard.tsx                 ← shared post display component
```

## Extended Section: Backend Package Structure

```
com.devpulse/
  BackendApplication.java
  auth/
    controller/AuthController.java
    dto/            (AuthRequest, AuthResponse, RegisterRequest, RefreshRequest)
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
```
