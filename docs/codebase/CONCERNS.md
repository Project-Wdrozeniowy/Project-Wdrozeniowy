# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| High | JWT stored in `localStorage` (XSS-exposed) | [frontend/src/services/authService.ts](../../frontend/src/services/authService.ts) — `localStorage.setItem(TOKEN_KEY, token)` | Any XSS vector can steal access + refresh tokens | Migrate to `httpOnly` cookie transport; gateway already supports `cookie-parser` |
| High | Shared `JWT_SECRET` has no rotation or distribution procedure | [.env.example](../../.env.example), [gateway/src/middleware/auth.ts](../../gateway/src/middleware/auth.ts) | Secret mismatch = 100% auth failure with no obvious error; compromised secret = full impersonation | Document rotation steps; consider asymmetric keys (RS256) so gateway only needs the public key |
| High | Redis provisioned in docker-compose with backend `depends_on: redis`, but no Redis client exists in the backend | [docker-compose.yml](../../docker-compose.yml) — `depends_on: redis: condition: service_healthy`; [backend/pom.xml](../../backend/pom.xml) — no `spring-data-redis` | Implicit dependency with no implementation; undefined purpose creates confusion; if Redis is removed from compose the backend may not start | Clarify Redis role [ASK USER]; either add `spring-data-redis` or remove the `depends_on` |
| Medium | Gateway is absent from `docker-compose.yml` | [docker-compose.yml](../../docker-compose.yml) — only postgres, redis, backend | Frontend → Gateway → Backend flow works in dev only if gateway is started manually; partial compose run breaks the full architecture | Add gateway service to docker-compose; document the intended local development startup |
| Medium | Forum data is fully mocked; no backend posts/forum API exists yet | [frontend/src/services/forumService.ts](../../frontend/src/services/forumService.ts) — `// TODO: replace with real API call when backend is ready`; DB schema exists in V2 migration | Forum feature is non-functional end-to-end; tests pass against mocks, not real data | Implement backend forum endpoints (PWDRZ backlog); connect forumService to real API |
| Medium | `INTERNAL_SECRET` declared in `.env.example` but never used | [.env.example](../../.env.example) | Unknown design intent; orphaned env var creates confusion during onboarding | [ASK USER] Clarify purpose; implement or remove |
| Low | `socket.io` installed in gateway but not wired to any route | [gateway/package.json](../../gateway/package.json) | Dead dependency adds ~4 MB to install; unclear feature intent | [ASK USER] Clarify WebSocket feature plan; connect or remove |

---

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| Mock-only forum service | Backend forum endpoints not yet implemented | [frontend/src/services/forumService.ts](../../frontend/src/services/forumService.ts) | Users see mock data in production; tests give false confidence | Implement `/api/posts`, `/api/categories` in backend; connect service |
| No E2E test suite | E2E tooling never set up | All three modules | UI regressions go undetected; component coverage is zero | Add Playwright or Cypress; automate login/register/forum flows |
| Coverage reports committed to repo | Generated files in `frontend/coverage/` and `gateway/coverage/` | [frontend/coverage/](../../frontend/coverage/), [gateway/coverage/](../../gateway/coverage/) | Repository bloat; diff noise on every test run | Add `coverage/` to `.gitignore`; use CI artifacts or Codecov instead |
| Backend has no formatter enforcement | No Maven Spotless/google-java-format configured | [backend/pom.xml](../../backend/pom.xml) | Inconsistent Java formatting as the team grows | Add Spotless Maven plugin with a style guide |
| Dual JWT verification (gateway + Spring Security) | Both layers verify JWTs independently | [gateway/src/middleware/auth.ts](../../gateway/src/middleware/auth.ts), [backend/src/main/java/com/devpulse/auth/filter/JwtAuthenticationFilter.java](../../backend/src/main/java/com/devpulse/auth/filter/JwtAuthenticationFilter.java) | Double work; harder to reason about auth flow; risk of divergent behaviour if configs differ | Document the intent: is the backend filter a defence-in-depth measure or a redundancy? [ASK USER] |
| No pagination in type definitions | `Post`, `Comment`, `User` types have no pagination wrappers | [frontend/src/shared/types/index.ts](../../frontend/src/shared/types/index.ts) | Scaling the API without pagination breaks all list endpoints | Define `Page<T>` type before implementing list endpoints |

---

### 3) Security Concerns

| Risk | OWASP category | Evidence | Current mitigation | Gap |
|------|----------------|----------|--------------------|-----|
| JWT in `localStorage` — XSS token theft | A03 Injection (XSS) | [frontend/src/services/authService.ts](../../frontend/src/services/authService.ts) | Non-functional session cookie (`orbita_session`) signals auth state but does not carry the token | Move JWT to `httpOnly; Secure` cookie; remove localStorage storage |
| `orbita_session` non-httpOnly cookie | A07 Identification and Authentication Failures | [frontend/src/services/authService.ts](../../frontend/src/services/authService.ts) | `SameSite=Lax; Secure` (on HTTPS) | Cookie is readable by JS — not a credential itself, but signals login state to potential attackers |
| Shared symmetric JWT secret | A02 Cryptographic Failures | [.env.example](../../.env.example) | Base64-encoded, ≥32 bytes enforced at startup ([JwtUtil.java](../../backend/src/main/java/com/devpulse/security/JwtUtil.java)) | No rotation; both gateway and backend share the same secret — compromise of one exposes both |
| No rate limiting on auth endpoints in backend | A07 Identification and Authentication Failures | [backend/src/main/java/com/devpulse/auth/controller/AuthController.java](../../backend/src/main/java/com/devpulse/auth/controller/AuthController.java) | Gateway rate limiter applies globally (100 req/min) | Backend has no per-endpoint auth rate limit; if gateway is bypassed, brute force is unmitigated |
| Swagger UI exposed (no auth) | A01 Broken Access Control | [backend/pom.xml](../../backend/pom.xml) — springdoc dependency | Acceptable in dev | Ensure Swagger UI is disabled or auth-protected in production |
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

1. **[ASK USER]** What is the intended use of Redis? (caching tokens, pub/sub for real-time events, session store?) — required to know whether to add `spring-data-redis` to backend or use it only in gateway.
2. **[ASK USER]** Should JWT storage migrate to `httpOnly` cookies? This is a breaking change to the auth flow and requires gateway/backend coordination.
3. **[ASK USER]** Is the backend `JwtAuthenticationFilter` intentional defence-in-depth, or a redundancy that can be removed now that the gateway verifies tokens?
4. **[ASK USER]** What is `INTERNAL_SECRET` intended for? (backend-to-gateway event dispatch as per `.env.example` comment — is this a planned webhook or server-sent events mechanism?)
5. **[ASK USER]** Is Socket.IO in the gateway planned for a specific real-time feature? What is the timeline?
6. **[ASK USER]** Is a Java code formatter (e.g., Spotless + google-java-format) planned for the backend?
7. **[ASK USER]** Should Swagger UI be disabled or protected in the production environment?

---

### 7) Evidence

- [docs/codebase/.codebase-scan.txt](../../docs/codebase/.codebase-scan.txt) — HIGH-CHURN FILES section
- [docker-compose.yml](../../docker-compose.yml) — Redis dependency
- [frontend/src/services/authService.ts](../../frontend/src/services/authService.ts) — localStorage token storage
- [frontend/src/services/forumService.ts](../../frontend/src/services/forumService.ts) — mock TODO
- [gateway/package.json](../../gateway/package.json) — socket.io dependency
- [.env.example](../../.env.example) — INTERNAL_SECRET
- [frontend/vitest.config.ts](../../frontend/vitest.config.ts) — coverage exclusions
- [gateway/jest.config.js](../../gateway/jest.config.js) — coverage exclusions
