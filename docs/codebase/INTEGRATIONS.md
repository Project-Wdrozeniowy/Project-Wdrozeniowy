# External Integrations

## Core Sections (Required)

### 1) Integration Inventory

| System | Type | Purpose | Auth model | Criticality | Evidence |
|--------|------|---------|------------|-------------|----------|
| PostgreSQL 16 | Relational database | Primary data store — users, roles, tokens, forum data, notifications, analytics | DB credentials (env vars) | High | [docker-compose.yml](../../docker-compose.yml), [backend/src/main/resources/application.properties](../../backend/src/main/resources/application.properties) |
| Redis 7 | In-memory cache / data structure store | Declared in docker-compose, not yet wired in application code | No auth configured in docker-compose | Medium (planned) | [docker-compose.yml](../../docker-compose.yml) |
| JWT (shared secret) | Internal auth token | Access token verification between gateway and backend | HMAC-SHA256, shared `JWT_SECRET` | High | [gateway/src/middleware/auth.ts](../../gateway/src/middleware/auth.ts), [backend/.../JwtUtil.java](../../backend/src/main/java/com/devpulse/security/JwtUtil.java) |
| SpringDoc / Swagger UI | Internal dev tooling | OpenAPI 3 docs at `/swagger-ui.html` | None (public in dev) | Low | [backend/pom.xml](../../backend/pom.xml), [backend/.../OpenApiConfig.java](../../backend/src/main/java/com/devpulse/config/OpenApiConfig.java) |
| Socket.IO | WebSocket server | Real-time events (installed in gateway, not wired) | [ASK USER] | Low (planned) | [gateway/package.json](../../gateway/package.json) |

---

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| PostgreSQL 16 | Single source of truth for all persistent data | Spring Data JPA repositories (`com.devpulse.auth.repository`), schema managed by Flyway | No read replicas; single connection pool; all traffic goes to one instance | [backend/src/main/resources/application.properties](../../backend/src/main/resources/application.properties) |
| Redis 7 | [TODO] — planned caching/session store | No client configured in backend or gateway as of this analysis | Backend `depends_on: redis` in docker-compose while the dependency is unused — startup ordering issue | [docker-compose.yml](../../docker-compose.yml) |

---

### 3) Database Schema

Four Flyway migrations define the full schema:

| Migration | Tables created | Evidence |
|-----------|---------------|----------|
| V1 — users | `users`, `roles`, `user_roles`, `refresh_tokens` | [V1__create_users.sql](../../backend/src/main/resources/db/migration/V1__create_users.sql) |
| V2 — forum | `categories`, `posts`, `comments`, `tags`, `post_tags`, `votes` | [V2__create_forum_tables.sql](../../backend/src/main/resources/db/migration/V2__create_forum_tables.sql) |
| V3 — notifications | `notifications` | [V3__create_notifications.sql](../../backend/src/main/resources/db/migration/V3__create_notifications.sql) |
| V4 — analytics | analytics-related tables | [V4__create_analytics_tables.sql](../../backend/src/main/resources/db/migration/V4__create_analytics_tables.sql) |

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

- **Retry/backoff**: No retry logic implemented in frontend (`axios`), gateway proxy, or backend service calls.
- **Timeout policy**: Frontend axios client has a 10-second timeout (`timeout: 10000`) configured in [frontend/src/services/api.ts](../../frontend/src/services/api.ts). Gateway proxy has no explicit timeout configured.
- **Circuit breaker**: None implemented.
- **Proxy error fallback**: Gateway returns `{ error: "Backend unavailable" }` with HTTP 502 if the backend is unreachable — implemented in [gateway/src/routes/proxy.ts](../../gateway/src/routes/proxy.ts).
- **Frontend auth error fallback**: axios interceptor auto-redirects to `/login` on 401 — [frontend/src/services/api.ts](../../frontend/src/services/api.ts).
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
