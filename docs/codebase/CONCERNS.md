# Codebase Concerns

> Snapshot scope: verified against source and configuration on 2026-10-11. This list records current gaps, not automatically approved product work. The [developer guides](../guides/README.md) hold target conventions; the Jira links below track implementation debt. `CODEBASE.md` was retired because it described superseded auth and forum behaviour.

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| Medium | The same runtime guidance is repeated in repository, service, and agent instructions | [README.md](../../README.md), [AGENTS.md](../../AGENTS.md), [.github/copilot-instructions.md](../../.github/copilot-instructions.md) | A future contract change can leave one reader with stale instructions | Keep code/configuration authoritative and update the relevant instructions together (PWDRZ-125) |
| High | Shared `JWT_SECRET` has no rotation or distribution procedure | [.env.example](../../.env.example), [gateway/src/middleware/auth.ts](../../gateway/src/middleware/auth.ts) | Secret mismatch = 100% auth failure with no obvious error; compromised secret = full impersonation | Document rotation steps; consider asymmetric keys (RS256) so gateway only needs the public key |
| Medium | Redis is provisioned but no application integration exists | [docker-compose.yml](../../docker-compose.yml), [backend/pom.xml](../../backend/pom.xml) | Its future role is not yet testable, while backend startup still depends on it | Keep the provisioned service; [PWDRZ-104](https://project-wdrz.atlassian.net/browse/PWDRZ-104) covers a planned real-time use, not a currently active integration |
| Medium | Forum feed remains disconnected from the implemented posts API | [frontend/src/hooks/usePosts.ts](../../frontend/src/hooks/usePosts.ts) — resolves `MOCK_POSTS` | Users see fixture data and FE tests do not exercise the API adapter | Complete PWDRZ-81; retain focused API-adapter tests |
| Low | `INTERNAL_SECRET` is reserved for backend-to-gateway event dispatch but not consumed yet | [.env.example](../../.env.example) | The event-dispatch contract and secret lifecycle are not defined | Decide the lifecycle when implementing event dispatch; do not present it as active configuration |
| Low | `socket.io` is installed for planned real-time notifications but not wired to the gateway | [gateway/package.json](../../gateway/package.json), [gateway/src/routes/wsProxy.ts](../../gateway/src/routes/wsProxy.ts) | The installed Socket.IO package does not provide a working client route; current WebSocket proxy uses STOMP | Keep the dependency until the real-time integration task decides how it is used |

---

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| Mock-only forum feed | Feed hook was built before posts UI integration | [frontend/src/hooks/usePosts.ts](../../frontend/src/hooks/usePosts.ts) | Users see mock data in the forum feed | Integrate `postService.list` through PWDRZ-81 |
| No mandatory E2E test suite or CI gate | E2E tooling has not been set up | All three modules | Cross-service UI regressions are not covered by browser-level tests; existing React Testing Library tests do not replace that signal | [PWDRZ-117](https://project-wdrz.atlassian.net/browse/PWDRZ-117) owns the tool choice, representative flows, and required CI gate |
| Coverage scope excludes executable frontend code | Vitest excludes `app/`, `components/`, `hooks/`, `lib/`, and `utils/` | [frontend/vitest.config.ts](../../frontend/vitest.config.ts) | A passing percentage does not measure those areas; no E2E suite currently replaces that signal | Investigate included paths and a meaningful threshold in PWDRZ-118; add cross-service tests in PWDRZ-117 |
| Frontend API types are hand-maintained | No generator in [frontend/package.json](../../frontend/package.json); [shared types](../../frontend/src/shared/types/index.ts) mirror Java DTOs manually | FE/BE fields or availability can drift without a failing type check | Generate types/bindings from [backend/openapi.json](../../backend/openapi.json) under [PWDRZ-130](https://project-wdrz.atlassian.net/browse/PWDRZ-130) |
| Frontend route orchestration and props names differ from target conventions | [login route](../../frontend/src/app/(auth)/login/page.tsx), [register route](../../frontend/src/app/(auth)/register/page.tsx), [UserActions](../../frontend/src/components/layout/header/UserActions.tsx) | Future features may continue putting business flow in route files or make prop contracts hard to find | [PWDRZ-131](https://project-wdrz.atlassian.net/browse/PWDRZ-131) and [PWDRZ-132](https://project-wdrz.atlassian.net/browse/PWDRZ-132) own focused FE cleanup |
| Java DTO names and table timestamps differ from target conventions | [AuthResponse.java](../../backend/src/main/java/com/devpulse/auth/dto/AuthResponse.java), [V2 forum migration](../../backend/src/main/resources/db/migration/V2__create_forum_tables.sql) | Contract names drift and tables have inconsistent audit metadata | BE-owned [PWDRZ-133](https://project-wdrz.atlassian.net/browse/PWDRZ-133) and [PWDRZ-134](https://project-wdrz.atlassian.net/browse/PWDRZ-134) |
| Gateway modules use mixed export styles | [auth.ts](../../gateway/src/middleware/auth.ts) defaults, [errorHandler.ts](../../gateway/src/middleware/errorHandler.ts) names | The new named-export convention is not yet consistent | [PWDRZ-136](https://project-wdrz.atlassian.net/browse/PWDRZ-136) owns a behaviour-preserving migration |
| GitHub enforcement and staging flow are not verified against the agreed policy | [CI workflows](../../.github/workflows/), local Git branches; GitHub ruleset API unavailable from this checkout | Guide and actual merge gates may diverge; existing `staging` branch alone does not prove a release process | [PWDRZ-137](https://project-wdrz.atlassian.net/browse/PWDRZ-137) verifies rules/checks; [PWDRZ-138](https://project-wdrz.atlassian.net/browse/PWDRZ-138) establishes promotion/hotfix flow |
| Dual JWT verification configuration | Gateway and Spring Security both verify access tokens as defence in depth | [gateway/src/middleware/auth.ts](../../gateway/src/middleware/auth.ts), [backend/src/main/java/com/devpulse/auth/filter/JwtAuthenticationFilter.java](../../backend/src/main/java/com/devpulse/auth/filter/JwtAuthenticationFilter.java) | Secret or algorithm drift can reject all protected requests | Keep the two configurations aligned and cover the gateway boundary with regression tests |
| Contract stubs still answer `501` | API surface was defined ahead of feature delivery | backend controller packages, `@Hidden` from the published contract since PWDRZ-127 | A client calling a planned path directly gets `501` | Implement each stub controller through the Jira task named in its Javadoc |

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
| Single PostgreSQL instance, no read replicas | [docker-compose.yml](../../docker-compose.yml) | No current symptom (dev stage) | Capacity could eventually become constrained under measured load | No replication task is justified without workload evidence |
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

1. **[TODO]** Redis is intentionally provisioned ahead of use. PWDRZ-104 proposes real-time pub/sub; confirm that concrete integration contract when implementing the task, not as a prerequisite to this documentation baseline.
2. **[ASK USER]** When backend-to-gateway event dispatch is designed, what lifecycle should `INTERNAL_SECRET` have?
3. **[TODO]** No Java formatter is configured. Do not infer that adopting one is approved work; the backend owner can propose it if formatting becomes a demonstrated team problem.

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
