# Architecture

> Snapshot scope: verified against source and runtime configuration on 2026-10-11. Source/configuration remain authoritative after this snapshot. Docker Compose starts PostgreSQL, Redis, backend, and gateway; the frontend runs separately. Approved extension rules are in the [developer architecture guide](../guides/architecture.md), not in this snapshot.

This documentation checkout predates PWDRZ-123 and PWDRZ-124. Its gateway
still strips `/api` and its backend still selects the JWT HMAC algorithm from
key length. Both fixes are present on `origin/develop`; bring them into this
branch before merging. The flow below describes the corrected integration
target, not a successful end-to-end check on this older checkout.

## Core Sections (Required)

### 1) Architectural Style

- **Primary style**: Three-tier layered architecture with a dedicated API Gateway tier
- **Why this classification**:
  - Tier 1 — Presentation: Next.js frontend handles all UI and client-side routing
  - Tier 2 — Gateway: Express proxy performs cross-cutting concerns (JWT auth, rate limiting, CORS) before requests reach business logic
  - Tier 3 — Application/Data: Spring Boot owns business logic and database persistence
  - Verified from [gateway/src/app.ts](../../gateway/src/app.ts), [gateway/src/routes/proxy.ts](../../gateway/src/routes/proxy.ts), and [backend/src/main/java/com/devpulse/auth/controller/AuthController.java](../../backend/src/main/java/com/devpulse/auth/controller/AuthController.java)
- **Primary constraints**:
  1. Stateless access-token verification; refresh tokens are stored and rotated server-side
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
    ├── /api/auth/login, /api/auth/register, /api/auth/refresh, /api/auth/logout → public routes
    └── /api/* → JWT verification → proxy to backend
                      │
                      │  HTTP proxy (http-proxy-middleware)
                      ▼
Backend (Spring Boot, port 8080)
    ├── JwtAuthenticationFilter (Spring Security) — re-validates JWT
    ├── /auth/** → AuthController → AuthService → UserRepository / JwtUtil
    └── user/forum controllers → services → repositories → PostgreSQL
                      │
                      ▼
PostgreSQL 16 (Flyway-managed schema)
```

Flow description:
1. Browser sends request. Token (if any) is attached from in-memory `tokenMemory` by the axios interceptor in [frontend/src/services/api.ts](../../frontend/src/services/api.ts).
2. Gateway checks public-route list. If route is not public, JWT is verified with `jsonwebtoken` using the shared `JWT_SECRET`.
3. Verified request is proxied to `BACKEND_URL` (Spring Boot).
4. Spring Security's `JwtAuthenticationFilter` re-validates the same JWT and populates `SecurityContext`.
5. Controller receives request, delegates to `AuthService`, which interacts with JPA repositories.
6. Response travels back through the proxy unchanged.

---

<a id="capability-status"></a>

### 2.1) Current capability status

This table is a documentation baseline, not a product roadmap. “Implemented” means an executable path is present in the repository; it does not replace feature-specific verification.

| Capability | Status | Evidence / boundary |
|---|---|---|
| Login, registration, refresh-token rotation, logout | Implemented in source; cross-service regression coverage remains | [AuthController](../../backend/src/main/java/com/devpulse/auth/controller/AuthController.java), [AuthProvider](../../frontend/src/providers/AuthProvider.tsx), [gateway public routes](../../gateway/src/config/index.ts); PWDRZ-114 and PWDRZ-117 track additional checks |
| User profile and account settings API | Implemented API; frontend page incomplete | [UserController](../../backend/src/main/java/com/devpulse/user/controller/UserController.java) exists; the [profile page](../../frontend/src/app/(main)/(protected)/profile/page.tsx) is still a placeholder; PWDRZ-60 owns the FE page |
| Forum post CRUD, pagination, search/filter API | Implemented API; frontend feed mocked | [PostController](../../backend/src/main/java/com/devpulse/forum/controller/PostController.java) and [PostService](../../backend/src/main/java/com/devpulse/forum/service/PostService.java) exist; [usePosts](../../frontend/src/hooks/usePosts.ts) returns `MOCK_POSTS` |
| Categories, comments, tags, votes, notifications, analytics, AI, recommendations | Contract stubs / deferred | Corresponding controllers return `501 NOT_IMPLEMENTED`, for example [CommentController](../../backend/src/main/java/com/devpulse/forum/controller/CommentController.java) |
| WebSocket / real-time notifications | Provisioned, not end-to-end | Spring WebSocket and gateway proxy paths exist; Socket.IO is not wired and subscriptions contain TODOs |
| Redis | Provisioned, not integrated | Compose service exists; no Redis client dependency or runtime use is present |

The earlier Jira bug descriptions are historical reports, not the present API
contract. PWDRZ-91–94 and PWDRZ-98 have audit comments explaining the current
auth/profile implementations and any changed design. PWDRZ-68 records that the
forum adapters are implemented but the feed still uses mocks; PWDRZ-81 owns
the feed integration. PWDRZ-114 owns missing gateway refresh/logout regression
checks, and PWDRZ-127 owns OpenAPI availability for `501` stubs. These
follow-ups do not change the implementation status of the original tickets.

---

### 3) Observed Layer/Module Responsibilities

| Layer or module | Current responsibility and overlap | Evidence |
|-----------------|------------------------------------|----------|
| Frontend `src/app/` | Routes and layout; login/register pages also perform form submission orchestration today | [login page](../../frontend/src/app/(auth)/login/page.tsx), [register page](../../frontend/src/app/(auth)/register/page.tsx) |
| Frontend `src/services/` | HTTP calls through `ApiClient`, including bearer-token injection and refresh/retry | [frontend/src/services/api.ts](../../frontend/src/services/api.ts) |
| Frontend `src/store/` | User/auth flags and UI state; access token itself is stored in `tokenMemory` | [authSlice](../../frontend/src/store/slices/authSlice.ts), [tokenMemory](../../frontend/src/lib/tokenMemory.ts) |
| Gateway middleware | JWT check, rate limiting, CORS, and logging | [gateway/src/middleware/](../../gateway/src/middleware/) |
| Gateway proxy routes | HTTP and WebSocket request forwarding to backend | [proxy.ts](../../gateway/src/routes/proxy.ts), [wsProxy.ts](../../gateway/src/routes/wsProxy.ts) |
| Backend `controller/` | HTTP request/response mapping | [AuthController.java](../../backend/src/main/java/com/devpulse/auth/controller/AuthController.java) |
| Backend `service/` | Domain operations and persistence coordination | [AuthService.java](../../backend/src/main/java/com/devpulse/auth/service/AuthService.java), [PostService.java](../../backend/src/main/java/com/devpulse/forum/service/PostService.java) |
| Backend `repository/` | Spring Data JPA repository access | [PostRepository.java](../../backend/src/main/java/com/devpulse/forum/repository/PostRepository.java) |
| Backend `security/JwtUtil` | Token signing, verification, parsing | [JwtUtil.java](../../backend/src/main/java/com/devpulse/security/JwtUtil.java) |
| Backend `exception/` | Error response mapping to RFC 9457 ProblemDetail | [GlobalExceptionHandler.java](../../backend/src/main/java/com/devpulse/exception/GlobalExceptionHandler.java) |
| Flyway migrations | Schema definition and versioning | [db/migration/](../../backend/src/main/resources/db/migration/) |

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
- **Redis declared but unused**: `docker-compose.yml` provisions Redis 7 and the backend `depends_on: redis`, but neither the backend `pom.xml` nor the gateway `package.json` has a Redis client. It is retained for future use; the first integration use case has not yet been selected. See [CONCERNS.md](CONCERNS.md).
- **API availability is uneven**: Auth, users, and forum posts have implementation paths. Several controller contracts (comments, votes, notifications, analytics, AI, recommendations) intentionally return `501 NOT_IMPLEMENTED`; OpenAPI must not be treated as proof that every advertised operation is usable.
- **Forum UI remains mocked at the query boundary**: [frontend/src/services/forumService.ts](../../frontend/src/services/forumService.ts) has real adapters for `/forum/posts`, but [frontend/src/hooks/usePosts.ts](../../frontend/src/hooks/usePosts.ts) still resolves `MOCK_POSTS` until the feed is migrated.

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
