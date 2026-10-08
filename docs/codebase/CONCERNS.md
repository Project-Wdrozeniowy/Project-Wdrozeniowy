# Codebase Concerns

> Snapshot scope: verified against source and configuration on 2026-10-08. This list records current risks, not historical reports. `CODEBASE.md` was retired because it described superseded auth and forum behaviour.

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| High | Documentation/instruction drift can direct contributors to obsolete API and auth behaviour | [.github/copilot-instructions.md](../../.github/copilot-instructions.md), historical reports | Incorrect implementation choices and duplicated work | Keep source/configuration as the documented authority; update instruction files together with contract changes |
| High | Shared `JWT_SECRET` has no rotation or distribution procedure | [.env.example](../../.env.example), [gateway/src/middleware/auth.ts](../../gateway/src/middleware/auth.ts) | Secret mismatch = 100% auth failure with no obvious error; compromised secret = full impersonation | Document rotation steps; consider asymmetric keys (RS256) so gateway only needs the public key |
| High | Redis is provisioned but no application integration exists | [docker-compose.yml](../../docker-compose.yml), [backend/pom.xml](../../backend/pom.xml) | Its future caching/session/pub-sub role is not yet testable, while startup still depends on it | Define the first integration use case and its owner; retain the provisioned Compose dependency until that work is planned |
| Medium | Forum feed remains disconnected from the implemented posts API | [frontend/src/hooks/usePosts.ts](../../frontend/src/hooks/usePosts.ts) — resolves `MOCK_POSTS` | Users see fixture data and FE tests do not exercise the API adapter | Complete PWDRZ-81; retain focused API-adapter tests |
| Medium | Controller contracts returning `501` are visible in OpenAPI | [backend/src/main/java/com/devpulse/analytics/controller/AnalyticsController.java](../../backend/src/main/java/com/devpulse/analytics/controller/AnalyticsController.java) | Clients may integrate against unavailable operations | Complete PWDRZ-127: align OpenAPI availability with implemented behaviour |
| Medium | `INTERNAL_SECRET` declared in `.env.example` but never used | [.env.example](../../.env.example) | Unknown design intent; orphaned env var creates confusion during onboarding | [ASK USER] Clarify purpose; implement or remove |
| Low | `socket.io` installed in gateway but not wired to any route | [gateway/package.json](../../gateway/package.json) | Dead dependency adds ~4 MB to install; unclear feature intent | [ASK USER] Clarify WebSocket feature plan; connect or remove |

---

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| Mock-only forum feed | Feed hook was built before posts UI integration | [frontend/src/hooks/usePosts.ts](../../frontend/src/hooks/usePosts.ts) | Users see mock data in the forum feed | Integrate `postService.list` through PWDRZ-81 |
| No E2E test suite | E2E tooling never set up | All three modules | UI regressions go undetected; component coverage is zero | Add Playwright or Cypress; automate login/register/forum flows |
| Coverage reports committed to repo | Generated files in `frontend/coverage/` and `gateway/coverage/` | [frontend/coverage/](../../frontend/coverage/), [gateway/coverage/](../../gateway/coverage/) | Repository bloat; diff noise on every test run | Add `coverage/` to `.gitignore`; use CI artifacts or Codecov instead |
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
| Redis exposed without password | A05 Security Misconfiguration | [docker-compose.yml](../../docker-compose.yml) — no `requirepass` | Only accessible within `devpulse-net` Docker network | If network isolation is broken, Redis is fully open |

---

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| Single PostgreSQL instance, no read replicas | [docker-compose.yml](../../docker-compose.yml) | No current symptom (dev stage) | All reads and writes compete on one instance | Add read replica for query-heavy forum/analytics endpoints |
| No database connection pool configuration | [backend/src/main/resources/application.properties](../../backend/src/main/resources/application.properties) — no HikariCP settings | No current symptom | Under load, connection exhaustion causes 500 errors | Configure `spring.datasource.hikari.*` pool size |
| React Query has no stale-time configured | [frontend/src/providers/QueryProvider.tsx](../../frontend/src/providers/QueryProvider.tsx) | Queries refetch on every window focus | Extra network traffic; poor UX on tab switch | Set `staleTime` per query or globally in QueryClient |
| High-churn files signal fragile areas | Scan output — `register/page.tsx` (15), `login/page.tsx` (13), `api.ts` (10), `authSlice.ts` (7) | Frequent bug-fix commits on auth pages | Auth flow fragility; regressions likely | Add integration tests for login/register flows |

---

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| [frontend/src/app/(auth)/register/page.tsx](../../frontend/src/app/(auth)/register/page.tsx) | Auth UX + Zod validation + form state all in one component; post-merge fixes | 15 commits in last 90 days | Extract form fields into sub-components; add integration test before refactoring |
| [frontend/src/app/(auth)/login/page.tsx](../../frontend/src/app/(auth)/login/page.tsx) | Same pattern as register; frequent formatting + logic fixes | 13 commits | Same as above |
| [frontend/src/services/api.ts](../../frontend/src/services/api.ts) | Base URL resolution logic for SSR/CSR/prod edge cases | 10 commits | Unit-test the `resolveBaseURL` method; document environment scenarios |
| [frontend/src/store/slices/authSlice.ts](../../frontend/src/store/slices/authSlice.ts) | Auth state wiring evolving alongside login/register pages | 7 commits | Ensure store tests cover all state transitions before changing |
| [frontend/src/app/_components/PostCard.tsx](../../frontend/src/app/_components/PostCard.tsx) | Central component shared across feed and forum | 7 commits | Add snapshot or RTL test before modifying props |
| [frontend/src/components/layout/Header.tsx](../../frontend/src/components/layout/Header.tsx) | Navigation changes trigger formatting and logic churn | 6 commits | Add RTL test for nav items and auth-conditional rendering |

---

### 6) `[ASK USER]` Questions

1. **[ASK USER]** Which first Redis use case should be implemented: cache, real-time pub/sub, or session support? This determines the application integration and test strategy.
2. **[ASK USER]** What is the concrete lifecycle for `INTERNAL_SECRET`, which is reserved for backend-to-gateway event dispatch but unused?
3. **[ASK USER]** Is a Java formatter (for example Spotless + google-java-format) planned for the backend?

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
