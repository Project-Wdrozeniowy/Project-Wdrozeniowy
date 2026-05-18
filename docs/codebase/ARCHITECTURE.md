# Architecture

## Core Sections (Required)

### 1) Architectural Style

- **Primary style**: Three-tier layered architecture with a dedicated API Gateway tier
- **Why this classification**:
  - Tier 1 — Presentation: Next.js frontend handles all UI and client-side routing
  - Tier 2 — Gateway: Express proxy performs cross-cutting concerns (JWT auth, rate limiting, CORS) before requests reach business logic
  - Tier 3 — Application/Data: Spring Boot owns business logic and database persistence
  - Verified from [gateway/src/app.ts](../../gateway/src/app.ts), [gateway/src/routes/proxy.ts](../../gateway/src/routes/proxy.ts), and [backend/src/main/java/com/devpulse/auth/controller/AuthController.java](../../backend/src/main/java/com/devpulse/auth/controller/AuthController.java)
- **Primary constraints**:
  1. Stateless authentication — no server sessions; JWT carries identity on every request
  2. Single JWT secret shared between gateway and backend — both verify tokens independently
  3. All frontend API calls route through the gateway on `/api/*`; direct backend access is not intended for clients

---

### 2) System Flow

```text
Browser (Next.js)
    │
    │  HTTP request with Bearer token
    ▼
Gateway (Express, port 3000)
    ├── helmet (security headers)
    ├── CORS check (whitelist)
    ├── morgan logger
    ├── rate limiter (100 req/min default)
    ├── /health → 200 OK (no auth)
    ├── /api/auth/login, /api/auth/register → bypass JWT check (public routes)
    └── /api/* → JWT verification → proxy to backend
                      │
                      │  HTTP proxy (http-proxy-middleware)
                      ▼
Backend (Spring Boot, port 8080)
    ├── JwtAuthenticationFilter (Spring Security) — re-validates JWT
    ├── /auth/** → AuthController → AuthService → UserRepository / JwtUtil
    └── (future controllers) → services → repositories → PostgreSQL
                      │
                      ▼
PostgreSQL 16 (Flyway-managed schema)
```

Flow description:
1. Browser sends request. Token (if any) is attached from `localStorage` by the axios interceptor in [frontend/src/services/api.ts](../../frontend/src/services/api.ts).
2. Gateway checks public-route list. If route is not public, JWT is verified with `jsonwebtoken` using the shared `JWT_SECRET`.
3. Verified request is proxied to `BACKEND_URL` (Spring Boot).
4. Spring Security's `JwtAuthenticationFilter` re-validates the same JWT and populates `SecurityContext`.
5. Controller receives request, delegates to `AuthService`, which interacts with JPA repositories.
6. Response travels back through the proxy unchanged.

---

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| Frontend `src/app/` | Page components, routing layout | API calls, token storage | [frontend/src/app/layout.tsx](../../frontend/src/app/layout.tsx) |
| Frontend `src/services/` | HTTP calls via `ApiClient` | UI state, component logic | [frontend/src/services/api.ts](../../frontend/src/services/api.ts) |
| Frontend `src/store/` | Auth state (token, user), UI state | HTTP calls | [frontend/src/store/slices/authSlice.ts](../../frontend/src/store/slices/authSlice.ts) |
| Gateway middleware | JWT check, rate limiting, CORS, logging | Business logic, DB access | [gateway/src/middleware/auth.ts](../../gateway/src/middleware/auth.ts) |
| Gateway proxy route | Request forwarding to backend | Token generation, business logic | [gateway/src/routes/proxy.ts](../../gateway/src/routes/proxy.ts) |
| Backend `controller/` | HTTP contract (request parsing, response mapping) | Business logic | [backend/.../AuthController.java](../../backend/src/main/java/com/devpulse/auth/controller/AuthController.java) |
| Backend `service/` | Business logic (registration, login, token issuance) | HTTP/persistence concerns | [backend/.../AuthService.java](../../backend/src/main/java/com/devpulse/auth/service/AuthService.java) |
| Backend `repository/` | JPA database access | Business logic | `com.devpulse.auth.repository` |
| Backend `security/JwtUtil` | Token signing, verification, parsing | Auth flow logic | [backend/.../JwtUtil.java](../../backend/src/main/java/com/devpulse/security/JwtUtil.java) |
| Backend `exception/` | Unified error response (RFC 9457 ProblemDetail) | Business logic | [backend/.../GlobalExceptionHandler.java](../../backend/src/main/java/com/devpulse/exception/GlobalExceptionHandler.java) |
| Database (Flyway) | Schema lifecycle management | Application logic | [backend/src/main/resources/db/migration/](../../backend/src/main/resources/db/migration/) |

---

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Gateway/Proxy pattern | [gateway/src/routes/proxy.ts](../../gateway/src/routes/proxy.ts) | Decouples frontend from backend; centralises cross-cutting concerns |
| Repository pattern | `com.devpulse.auth.repository` (Spring Data JPA) | Abstracts DB access; testable without a real DB |
| DTO pattern | `com.devpulse.auth.dto` (AuthRequest, AuthResponse, etc.) | Prevents entity leakage to HTTP layer |
| Strategy / slice pattern | [frontend/src/store/](../../frontend/src/store/index.ts) (Zustand slices) | Composable state modules without boilerplate |
| Global error handler | [backend/.../GlobalExceptionHandler.java](../../backend/src/main/java/com/devpulse/exception/GlobalExceptionHandler.java) | Consistent RFC 9457 ProblemDetail responses across all controllers |
| Singleton HTTP client | [frontend/src/services/api.ts](../../frontend/src/services/api.ts) (`ApiClient` class) | Single axios instance with interceptors for auth token injection |
| Filter chain | [backend/.../JwtAuthenticationFilter.java](../../backend/src/main/java/com/devpulse/auth/filter/JwtAuthenticationFilter.java) | Decouples auth from controllers; plugs into Spring Security |

---

### 5) Known Architectural Risks

- **Dual JWT verification (gateway + backend)**: Both the gateway and Spring Security verify the JWT. If the shared `JWT_SECRET` diverges between services, 100% of authenticated requests will fail with no obvious error. There is no documented secret rotation or distribution procedure.
- **Redis declared but unused**: `docker-compose.yml` provisions Redis 7 and the backend `depends_on: redis`, but neither the backend `pom.xml` nor the gateway `package.json` has a Redis client. The intended use (sessions, caching, pub/sub) is undocumented. See [CONCERNS.md](CONCERNS.md).
- **Gateway not in docker-compose**: The `docker-compose.yml` runs only `postgres`, `redis`, and `backend`. The gateway must be started separately, which creates a gap between the documented architecture (Frontend → Gateway → Backend) and the containerised stack.
- **Forum data is mocked**: [frontend/src/services/forumService.ts](../../frontend/src/services/forumService.ts) returns static mock data; the `/api/posts` endpoint does not exist in the backend yet.

---

### 6) Evidence

- [gateway/src/app.ts](../../gateway/src/app.ts)
- [gateway/src/routes/proxy.ts](../../gateway/src/routes/proxy.ts)
- [gateway/src/middleware/auth.ts](../../gateway/src/middleware/auth.ts)
- [backend/src/main/java/com/devpulse/config/SecurityConfig.java](../../backend/src/main/java/com/devpulse/config/SecurityConfig.java)
- [backend/src/main/java/com/devpulse/auth/filter/JwtAuthenticationFilter.java](../../backend/src/main/java/com/devpulse/auth/filter/JwtAuthenticationFilter.java)
- [backend/src/main/java/com/devpulse/security/JwtUtil.java](../../backend/src/main/java/com/devpulse/security/JwtUtil.java)
- [docker-compose.yml](../../docker-compose.yml)
- [docs/db-schema.mmd](../../docs/db-schema.mmd) — full ER diagram
