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
| Forum post CRUD, pagination, search/filter API | Implemented API; frontend feed mocked | [PostController](../../backend/src/main/java/com/devpulse/forum/controller/PostController.java) and [PostService](../../backend/src/main/java/com/devpulse/forum/service/PostService.java) exist, and every listed post carries its tags sorted by slug (`PostSummaryDto.tags`, loaded in one query per page); `createdFrom` (inclusive), `createdTo` (exclusive) and `uncategorized=true` list the posts behind a public analytics day or category row; [usePosts](../../frontend/src/hooks/usePosts.ts) returns `MOCK_POSTS` |
| Categories | Implemented API; default categories seeded by V6 | [CategoryController](../../backend/src/main/java/com/devpulse/forum/controller/CategoryController.java) and [CategoryService](../../backend/src/main/java/com/devpulse/forum/service/CategoryService.java): public reads of visible categories; admins create, edit, hide and delete by slug (409 names a taken `name` or `slug`; deleting keeps the posts without a category) |
| Search across posts, users and tags | Implemented API | [SearchController](../../backend/src/main/java/com/devpulse/search/controller/SearchController.java) and [SearchService](../../backend/src/main/java/com/devpulse/search/service/SearchService.java): public `GET /search`, one page per kind; the gateway lists it as a public route |
| Analytics | Implemented API | [AnalyticsController](../../backend/src/main/java/com/devpulse/analytics/controller/AnalyticsController.java) and [AnalyticsService](../../backend/src/main/java/com/devpulse/analytics/service/AnalyticsService.java): own activity, post engagement (staff), platform summary and daily trends (admins), public trending posts and daily public activity by UTC day (`GET /analytics/public/activity`) and the same window's public posts by category with shares (`GET /analytics/public/categories`) and against the equally long window right before it (`GET /analytics/public/comparison`); daily openings of the caller's own post (`GET /analytics/me/posts/{id}/openings`, author only, days before the collection start in `analytics_collection_starts` not measured); intentional openings (`POST /forum/posts/{slug}/openings`, guests and members, idempotent per `openingId`) add `POST_VIEWED` events in `activity_events` and `posts.view_count`, while reading a post counts nothing |
| Notifications | Implemented API; creation and real-time delivery pending | [NotificationController](../../backend/src/main/java/com/devpulse/notification/controller/NotificationController.java): the caller's list (`unreadOnly`), mark read, mark all read, delete; notifications are created by the features that cause them (PWDRZ-142) and pushed in real time under PWDRZ-104 |
| Post subscriptions | Implemented API | [PostSubscriptionController](../../backend/src/main/java/com/devpulse/forum/controller/PostSubscriptionController.java): `PUT`/`DELETE /forum/posts/{slug}/subscription`, `GET /users/me/subscriptions`; [PostSubscriptionService](../../backend/src/main/java/com/devpulse/forum/service/PostSubscriptionService.java)`.subscribersToNotify` selects whom a new comment notifies |
| Comments | Implemented API | [CommentController](../../backend/src/main/java/com/devpulse/forum/controller/CommentController.java): `GET`/`POST /forum/posts/{slug}/comments` (root comments paged, replies nested to depth 5), `PATCH`/`DELETE /forum/comments/{id}` (author or staff, soft delete); [CommentService](../../backend/src/main/java/com/devpulse/forum/service/CommentService.java) keeps `posts.comment_count` and `users.comment_count` and stores `COMMENT_ON_POST`/`REPLY_TO_COMMENT` notifications |
| Votes | Implemented API | [VoteController](../../backend/src/main/java/com/devpulse/forum/controller/VoteController.java) casts, switches and retracts votes on posts and comments through [VoteService](../../backend/src/main/java/com/devpulse/forum/service/VoteService.java); post reads include the caller's `myVote` |
| Tag list | Implemented API | [TagController](../../backend/src/main/java/com/devpulse/forum/controller/TagController.java): public `GET /forum/tags`, tags of published posts by `postCount` descending, then name; a tag's posts come from `GET /forum/posts?tag={slug}` |
| Recommendations | Implemented API | [RecommendationController](../../backend/src/main/java/com/devpulse/recommendation/controller/RecommendationController.java): public `GET /recommendations/posts` and `/tags`; ordered rules in [RecommendationRepository](../../backend/src/main/java/com/devpulse/recommendation/repository/RecommendationRepository.java) from the caller's posts, upvotes and comments, then the 7-day trending score of the analytics |
| AI tag suggestions | Implemented API; provider optional | [AiController](../../backend/src/main/java/com/devpulse/ai/controller/AiController.java): `POST /ai/suggest-tags` for signed-in users; [AiTagClient](../../backend/src/main/java/com/devpulse/ai/client/AiTagClient.java) asks an OpenAI-compatible provider configured by `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` to choose existing tags, and [KeywordTagExtractor](../../backend/src/main/java/com/devpulse/ai/service/KeywordTagExtractor.java) answers without it or when it fails |
| WebSocket / real-time notifications | Provisioned, not end-to-end | Spring WebSocket and gateway proxy paths exist; Socket.IO is not wired and subscriptions contain TODOs |
| Redis | Provisioned, not integrated | Compose service exists; no Redis client dependency or runtime use is present |

The earlier Jira bug descriptions are historical reports, not the present API
contract. PWDRZ-91–94 and PWDRZ-98 have audit comments explaining the current
auth/profile implementations and any changed design. PWDRZ-68 records that the
forum adapters are implemented but the feed still uses mocks; PWDRZ-81 owns
the feed integration. PWDRZ-114 owns missing gateway refresh/logout regression
checks. PWDRZ-127 removed the `501` stubs from the published OpenAPI contract. These
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
- **Every REST controller is implemented**: auth, users, forum posts, categories, tags, comments, votes, search, subscriptions, notifications, analytics, recommendations and AI tag suggestions. The published contract, [backend/openapi.json](../../backend/openapi.json), lists implemented operations only, and `OpenApiContractTest` fails if a `501` stub is published.
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
