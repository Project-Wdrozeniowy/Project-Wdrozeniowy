# Codebase Concerns

> Snapshot scope: verified against source and configuration on 2026-10-09. This list records current risks, not historical reports. `CODEBASE.md` was retired because it described superseded auth and forum behaviour.

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| Medium | The same runtime guidance is repeated in repository, service, and agent instructions | [README.md](../../README.md), [AGENTS.md](../../AGENTS.md), [.github/copilot-instructions.md](../../.github/copilot-instructions.md) | A future contract change can leave one reader with stale instructions | Keep code/configuration authoritative and update the relevant instructions together (PWDRZ-125) |
| High | Shared `JWT_SECRET` has no rotation or distribution procedure | [.env.example](../../.env.example), [gateway/src/middleware/auth.ts](../../gateway/src/middleware/auth.ts) | Secret mismatch = 100% auth failure with no obvious error; compromised secret = full impersonation | Document rotation steps; consider asymmetric keys (RS256) so gateway only needs the public key |
| Medium | Redis is provisioned but no application integration exists | [docker-compose.yml](../../docker-compose.yml), [backend/pom.xml](../../backend/pom.xml) | Its planned role is not yet testable, while backend startup still depends on it | Define the first integration use case and its owner; retain the provisioned Compose dependency until that work is planned |
| Medium | Forum feed remains disconnected from the implemented posts API | [frontend/src/hooks/usePosts.ts](../../frontend/src/hooks/usePosts.ts) — resolves `MOCK_POSTS` | Users see fixture data and FE tests do not exercise the API adapter | Complete PWDRZ-81; retain focused API-adapter tests |
| Medium | Controller contracts returning `501` are visible in OpenAPI | [backend/src/main/java/com/devpulse/analytics/controller/AnalyticsController.java](../../backend/src/main/java/com/devpulse/analytics/controller/AnalyticsController.java) | Clients may integrate against unavailable operations | Complete PWDRZ-127: align OpenAPI availability with implemented behaviour |
| Low | `INTERNAL_SECRET` is reserved for backend-to-gateway event dispatch but not consumed yet | [.env.example](../../.env.example) | The event-dispatch contract and secret lifecycle are not defined | Decide the lifecycle when implementing event dispatch; do not present it as active configuration |
| Low | `socket.io` is installed for planned real-time notifications but not wired to the gateway | [gateway/package.json](../../gateway/package.json), [gateway/src/routes/wsProxy.ts](../../gateway/src/routes/wsProxy.ts) | The installed Socket.IO package does not provide a working client route; current WebSocket proxy uses STOMP | Keep the dependency until the real-time integration task decides how it is used |

---

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| Mock-only forum feed | Feed hook was built before posts UI integration | [frontend/src/hooks/usePosts.ts](../../frontend/src/hooks/usePosts.ts) | Users see mock data in the forum feed | Integrate `postService.list` through PWDRZ-81 |
| No E2E test suite | E2E tooling never set up | All three modules | Cross-service UI regressions are not covered by browser-level tests; existing React Testing Library tests do not replace that signal | Add Playwright or Cypress; automate login/register/forum flows under PWDRZ-117 |
| Coverage scope excludes executable frontend code | Vitest excludes `app/`, `components/`, `hooks/`, `lib/`, and `utils/` | [frontend/vitest.config.ts](../../frontend/vitest.config.ts) | A passing percentage does not measure those areas; no E2E suite currently replaces that signal | Investigate included paths and a meaningful threshold in PWDRZ-118; add cross-service tests in PWDRZ-117 |
| Backend has no formatter enforcement | No Maven Spotless/google-java-format configured | [backend/pom.xml](../../backend/pom.xml) | Inconsistent Java formatting as the team grows | Add Spotless Maven plugin with a style guide |
| Dual JWT verification configuration | Gateway and Spring Security both verify access tokens as defence in depth | [gateway/src/middleware/auth.ts](../../gateway/src/middleware/auth.ts), [backend/src/main/java/com/devpulse/auth/filter/JwtAuthenticationFilter.java](../../backend/src/main/java/com/devpulse/auth/filter/JwtAuthenticationFilter.java) | Secret or algorithm drift can reject all protected requests | Keep the two configurations aligned and cover the gateway boundary with regression tests |
| Contract stubs mixed with implemented endpoints | API surface was defined ahead of feature delivery | backend controller packages | Consumers can confuse planned and usable operations | Mark unavailable operations accurately in OpenAPI under PWDRZ-127 |

---

### 3) Security Concerns

| Risk | OWASP category | Evidence | Current mitigation | Gap |
|------|----------------|----------|--------------------|-----|
| Access-token exposure after XSS | A03 Injection (XSS) | [frontend/src/lib/tokenMemory.ts](../../frontend/src/lib/tokenMemory.ts) | Access token is memory-only and refresh token is `HttpOnly` | Any in-memory bearer token is readable by injected script until expiry; maintain XSS prevention and short token lifetime |
| Shared symmetric JWT secret | A02 Cryptographic Failures | [.env.example](../../.env.example) | Base64-encoded, ≥32 bytes enforced at startup ([JwtUtil.java](../../backend/src/main/java/com/devpulse/security/JwtUtil.java)) | No rotation; both gateway and backend share the same secret — compromise of one exposes both |
| No rate limiting on auth endpoints in backend | A07 Identification and Authentication Failures | [backend/src/main/java/com/devpulse/auth/controller/AuthController.java](../../backend/src/main/java/com/devpulse/auth/controller/AuthController.java) | Gateway rate limiter applies globally (100 req/min) | Backend has no per-endpoint auth rate limit; if gateway is bypassed, brute force is unmitigated |
| Swagger/UI exposure if enabled outside development | A05 Security Misconfiguration | [backend/src/main/resources/application.properties](../../backend/src/main/resources/application.properties) | Disabled by default through `SWAGGER_ENABLED=false` | Deployment configuration must not enable it unintentionally |
| Redis exposed without password | A05 Security Misconfiguration | [docker-compose.yml](../../docker-compose.yml) — no `requirepass`, host port `6379:6379` published | Compose is for local development, not production deployment | Host-network access to port 6379 must be restricted before using this stack on a shared host |

---

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| Single PostgreSQL instance, no read replicas | [docker-compose.yml](../../docker-compose.yml) | No current symptom (dev stage) | All reads and writes compete on one instance | Add read replica for query-heavy forum/analytics endpoints |
| No project-specific database pool tuning | [backend/src/main/resources/application.properties](../../backend/src/main/resources/application.properties) — no `spring.datasource.hikari.*` settings | No current symptom; Spring Boot supplies a default pool | Defaults may need adjustment under measured load | Tune only after collecting connection and query-load measurements |

---

### 5) Recently Changed Areas

The scan below reports changes within the last 90 days, not defects or proof
that a file is fragile. Review these areas carefully when changing auth or UI.

| Area | Why it matters | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| [frontend/src/app/(auth)/register/page.tsx](../../frontend/src/app/(auth)/register/page.tsx) | Registration form and validation | 3 commits in the current 90-day scan | Preserve registration contract tests when changing fields |
| [frontend/src/app/(auth)/login/page.tsx](../../frontend/src/app/(auth)/login/page.tsx) | Login form and auth state | 3 commits | Verify username submission and session restoration after changes |
| [frontend/src/services/api.ts](../../frontend/src/services/api.ts) | Base URL resolution and refresh/retry behaviour | 3 commits | Cover the affected environment and 401 paths |
| [frontend/src/components/layout/Header.tsx](../../frontend/src/components/layout/Header.tsx) | Shared navigation | 3 commits | Run component/integration checks for changed navigation |

---

### 6) `[ASK USER]` Questions

1. **[ASK USER]** When Redis is integrated in a future feature task, which first use case should own it: cache, real-time pub/sub, or session support?
2. **[ASK USER]** When backend-to-gateway event dispatch is designed, what lifecycle should `INTERNAL_SECRET` have?
3. **[ASK USER]** If backend formatting becomes a team requirement, which formatter/style should the Java owner adopt?

These are deferred product/tooling decisions and do not block PWDRZ-120's
current-state baseline.

---

### 7) Evidence

- [docs/codebase/.codebase-scan.txt](../../docs/codebase/.codebase-scan.txt) — HIGH-CHURN FILES section
- [docker-compose.yml](../../docker-compose.yml) — Redis dependency
- [frontend/src/lib/tokenMemory.ts](../../frontend/src/lib/tokenMemory.ts) — memory-only access token
- [frontend/src/hooks/usePosts.ts](../../frontend/src/hooks/usePosts.ts) — feed mock TODO
- [gateway/package.json](../../gateway/package.json) — socket.io dependency
- [.env.example](../../.env.example) — INTERNAL_SECRET
- [frontend/vitest.config.ts](../../frontend/vitest.config.ts) — coverage exclusions
- [gateway/jest.config.js](../../gateway/jest.config.js) — coverage exclusions
