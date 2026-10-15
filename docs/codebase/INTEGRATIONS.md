# External Integrations

> Snapshot scope: verified against runtime configuration and source on 2026-10-11. PostgreSQL/Flyway, gateway proxy/JWT, cookie refresh, Springdoc and STOMP WebSocket configuration exist. Redis, Socket.IO and `INTERNAL_SECRET` are provisioned or declared but are not application integrations yet.

Branch caveat: this checkout predates the merged PWDRZ-123 proxy-prefix and
PWDRZ-124 explicit-HS256 fixes on `origin/develop`. The JWT algorithm row
below describes the corrected `develop` contract; this branch must take those
commits before its runtime behaviour matches that contract.

## Core Sections (Required)

### 1) Integration Inventory

| System | Type | Purpose | Auth model | Criticality | Evidence |
|--------|------|---------|------------|-------------|----------|
| PostgreSQL 16 | Relational database | Primary data store — users, roles, tokens, forum data, notifications, analytics | DB credentials (env vars) | High | [docker-compose.yml](../../docker-compose.yml), [backend/src/main/resources/application.properties](../../backend/src/main/resources/application.properties) |
| Redis 7 | In-memory data store | Declared in Compose, not yet wired in application code | No auth configured; Compose publishes host port 6379 | Medium (planned) | [docker-compose.yml](../../docker-compose.yml) |
| JWT (shared secret) | Internal auth token | Access token verification between gateway and backend | HMAC-SHA256, shared `JWT_SECRET` | High | [gateway/src/middleware/auth.ts](../../gateway/src/middleware/auth.ts), [backend/.../JwtUtil.java](../../backend/src/main/java/com/devpulse/security/JwtUtil.java) |
| SpringDoc / Swagger UI | Internal dev tooling | OpenAPI 3.1 document at `/api/v3/api-docs` and Swagger UI at `/api/swagger-ui/index.html` when enabled; committed copy in [backend/openapi.json](../../backend/openapi.json) | Disabled by default; enable locally with `SWAGGER_ENABLED=true` | Low | [backend/src/main/resources/application.properties](../../backend/src/main/resources/application.properties), [backend/.../OpenApiConfig.java](../../backend/src/main/java/com/devpulse/config/OpenApiConfig.java) |
| STOMP WebSocket proxy | Gateway-to-backend transport | `/ws` proxy path exists, but subscription/event business logic is incomplete | Backend authenticates the STOMP CONNECT frame | Medium (partial) | [gateway/src/routes/wsProxy.ts](../../gateway/src/routes/wsProxy.ts), [backend/src/main/java/com/devpulse/websocket/controller/WebSocketController.java](../../backend/src/main/java/com/devpulse/websocket/controller/WebSocketController.java) |
| Socket.IO | Installed dependency | Planned for real-time notifications, not wired to the gateway server | Not implemented | Low (planned) | [gateway/package.json](../../gateway/package.json) |

---

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| PostgreSQL 16 | Single source of truth for all persistent data | Spring Data JPA repositories (`com.devpulse.auth.repository`), schema managed by Flyway | No read replicas; single connection pool; all traffic goes to one instance | [backend/src/main/resources/application.properties](../../backend/src/main/resources/application.properties) |
| Redis 7 | [TODO] — planned caching, events, or session use case | No client configured in backend or gateway as of this analysis | Backend `depends_on: redis` while the dependency is unused; host port 6379 is published in the development Compose stack | [docker-compose.yml](../../docker-compose.yml) |

---

### 3) Database Schema

Five Flyway migrations define the current schema:

| Migration | Tables created | Evidence |
|-----------|---------------|----------|
| V1 — users | `users`, `refresh_tokens`; role/status are enum columns on `users`, not separate tables | [V1__create_users.sql](../../backend/src/main/resources/db/migration/V1__create_users.sql) |
| V2 — forum | `categories`, `posts`, `comments`, `tags`, `post_tags`, `votes` | [V2__create_forum_tables.sql](../../backend/src/main/resources/db/migration/V2__create_forum_tables.sql) |
| V3 — notifications | `notifications`, `post_subscriptions` | [V3__create_notifications.sql](../../backend/src/main/resources/db/migration/V3__create_notifications.sql) |
| V4 — analytics | `activity_events` | [V4__create_analytics_tables.sql](../../backend/src/main/resources/db/migration/V4__create_analytics_tables.sql) |
| V5 — refresh-token rotation | `refresh_tokens.replaced_by_token_id` self-reference | [V5__add_replaced_by_to_refresh_tokens.sql](../../backend/src/main/resources/db/migration/V5__add_replaced_by_to_refresh_tokens.sql) |

ER diagrams available: [docs/db-schema.mmd](../../docs/db-schema.mmd), [docs/db-schema-auth.mmd](../../docs/db-schema-auth.mmd), [docs/db-schema-forum.mmd](../../docs/db-schema-forum.mmd), [docs/db-schema-social.mmd](../../docs/db-schema-social.mmd).

---

### 4) Secrets and Credentials Handling

- **Credential sources**: All secrets loaded from environment variables; templates in [.env.example](../../.env.example) and [gateway/.env.example](../../gateway/.env.example)
- **Hardcoding checks**: No hardcoded credentials found in production code. The test config [backend/src/test/resources/application-test.properties](../../backend/src/test/resources/application-test.properties) contains a test-only Base64 JWT secret — acceptable for test fixtures.
- **`JWT_SECRET` sharing**: The same `JWT_SECRET` must be set in both gateway and backend environments. No automated sync mechanism exists.
- **Rotation notes**: [ASK USER] No secret rotation mechanism or lifecycle procedure is documented.
- **`INTERNAL_SECRET`**: Declared in [.env.example](../../.env.example) with the comment "for backend-to-gateway event dispatch" but not consumed by any application code at the time of this analysis.

---

### 5) Reliability and Failure Behavior

- **Retry/backoff**: The frontend retries a protected request once after a
  successful auth-cookie refresh; no general retry/backoff policy is configured
  for frontend, gateway proxy, or backend service calls.
- **Timeout policy**: Frontend axios client has a 10-second timeout (`timeout: 10000`) configured in [frontend/src/services/api.ts](../../frontend/src/services/api.ts). Gateway proxy has no explicit timeout configured.
- **Circuit breaker**: None implemented.
- **Proxy error fallback**: Gateway returns HTTP 502 with `message: "Backend unavailable"` in its standard error body if the backend is unreachable — implemented in [gateway/src/routes/proxy.ts](../../gateway/src/routes/proxy.ts) and [sendError](../../gateway/src/middleware/errorHandler.ts).
- **Frontend auth error fallback**: the axios interceptor refreshes once using the HttpOnly cookie, retries the request, then clears in-memory state and redirects to `/login` only if refresh fails — [frontend/src/services/api.ts](../../frontend/src/services/api.ts).
- **Docker health checks**: PostgreSQL and Redis have health checks; backend `depends_on` waits for both to be healthy before starting.

---

### 6) Observability for Integrations

- **Gateway request logging**: morgan middleware logs all HTTP requests — [gateway/src/middleware/logger.ts](../../gateway/src/middleware/logger.ts)
- **Backend logging**: `@Slf4j` on `JwtUtil` logs JWT-related events; no structured/JSON logging config found
- **Metrics/tracing**: None configured. No APM agent, OpenTelemetry, Prometheus, or similar found.
- **Missing visibility gaps**: No distributed tracing between gateway and backend; no error rate dashboards; no alerting.

---

### 7) Evidence

- [docker-compose.yml](../../docker-compose.yml)
- [.env.example](../../.env.example)
- [gateway/.env.example](../../gateway/.env.example)
- [backend/src/main/resources/application.properties](../../backend/src/main/resources/application.properties)
- [gateway/src/middleware/auth.ts](../../gateway/src/middleware/auth.ts)
- [gateway/src/routes/proxy.ts](../../gateway/src/routes/proxy.ts)
- [backend/src/main/java/com/devpulse/security/JwtUtil.java](../../backend/src/main/java/com/devpulse/security/JwtUtil.java)
- [backend/src/main/resources/db/migration/](../../backend/src/main/resources/db/migration/)
