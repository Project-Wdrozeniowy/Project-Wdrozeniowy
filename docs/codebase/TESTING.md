# Testing Patterns

> Snapshot scope: verified against the local test configuration and CI on 2026-10-11. All three local configurations currently enforce 65%; the CI job labels that say 50% are stale labels, not the active thresholds. PWDRZ-118 owns the future threshold decision. This describes current tests, not the target policy in the [testing guide](../guides/testing.md).

## Core Sections (Required)

### 1) Test Stack and Commands

#### Frontend
- **Primary test framework**: Vitest 3.1.x
- **Assertion/mocking tools**: `@testing-library/react` 16, `@testing-library/jest-dom` 6, `@testing-library/user-event` 14, `axios-mock-adapter` 2
- **Environment**: jsdom 26 (simulates browser DOM)

```bash
cd frontend
npm run test            # vitest run (single pass)
npm run test:coverage   # vitest run --coverage (threshold: 65%)
```

#### Gateway
- **Primary test framework**: Jest 29 with ts-jest 29
- **Assertion/mocking tools**: Jest built-in mocks, `supertest` 7 (HTTP-level integration)
- **Environment**: node

```bash
cd gateway
npm run test            # jest --coverage
npm run test:coverage   # jest --coverage
```

#### Backend
- **Primary test framework**: JUnit 5 (via `spring-boot-starter-test`)
- **Assertion/mocking tools**: Mockito (via `spring-boot-starter-test`), `spring-security-test`, AssertJ
- **Database**: pure Mockito tests need no database. Spring tests use PostgreSQL from `application-test.properties`; ordinary tests let Hibernate create/drop the schema, while `@MigratedSchemaTest` applies real Flyway migrations to `migration_test` and validates the mappings.

```bash
cd backend
./mvnw test                          # run all tests
./mvnw verify                        # run tests, report and enforce JaCoCo coverage
```

---

### 2) Test Layout

#### Frontend
- **Test file placement**: `__tests__/` subdirectory alongside the module under test
  - `frontend/src/services/__tests__/` — service layer tests
  - `frontend/src/store/__tests__/` — Zustand store tests
  - `frontend/src/providers/__tests__/` — provider component tests
- **Naming convention**: `<FileName>.test.ts` or `<FileName>.test.tsx`
- **Setup file**: [frontend/src/test/setup.ts](../../frontend/src/test/setup.ts) — registered via `setupFiles` in [frontend/vitest.config.ts](../../frontend/vitest.config.ts)

#### Gateway
- **Test file placement**: `src/__tests__/` (top-level) and `src/middleware/__tests__/` (co-located)
  - `gateway/src/__tests__/app.test.ts` — HTTP-level Express app test; its proxy is mocked
  - `gateway/src/__tests__/config.test.ts` — config loading tests
  - `gateway/src/middleware/__tests__/` — per-middleware unit tests
- **Naming convention**: `<filename>.test.ts`
- **Setup file**: [gateway/src/test/setup.ts](../../gateway/src/test/setup.ts) — registered via `setupFiles` in [gateway/jest.config.js](../../gateway/jest.config.js)

#### Backend
- **Test file placement**: mirrors `src/main/java` under `src/test/java`
  - `backend/src/test/java/com/devpulse/auth/controller/AuthControllerTest.java`
  - `backend/src/test/java/com/devpulse/auth/service/AuthServiceTest.java`
  - `backend/src/test/java/com/devpulse/auth/service/UserDetailsServiceImplTest.java`
  - `backend/src/test/java/com/devpulse/auth/filter/JwtAuthenticationFilterTest.java`
  - `backend/src/test/java/com/devpulse/security/JwtUtilTest.java`
  - `backend/src/test/java/com/devpulse/BackendApplicationTests.java`
- **Naming convention**: `<ClassName>Test.java`
- **Config**: [backend/src/test/resources/application-test.properties](../../backend/src/test/resources/application-test.properties) — overrides datasource and disables Flyway for unit tests

---

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit | Yes | Frontend: services, store slices; Gateway: middleware, config; Backend: service, JWT util, filter | Main test focus for all three modules |
| Integration | Yes (partial) | Gateway: `app.test.ts` via supertest; backend: `AuthCookieFlowTest`, `MigrationSchemaTest`, `PostControllerApiTest` | The annotated backend tests use real Flyway migrations against PostgreSQL; `AuthControllerTest` is a focused standalone MockMvc test without a Spring context |
| E2E | No | — | No Playwright, Cypress, or similar found in any `package.json` |
| Visual regression | No | — | Not configured |

---

### 4) Mocking and Isolation Strategy

#### Frontend
- HTTP calls mocked with `axios-mock-adapter` — intercepts axios requests at the adapter level
- React components tested with `@testing-library/react` + jsdom; no snapshot tests observed
- Test isolation: token state is reset through `tokenMemory` in tests; refresh-cookie behaviour is exercised through mocked HTTP responses.

#### Gateway
- Express middleware tested in isolation by calling handler functions directly or via `supertest`
- JWT operations mocked with Jest `jest.mock('jsonwebtoken')` or tested with real tokens (test secret in setup)
- In this checkout, proxy routing and `authGuard.ts` are excluded from coverage in [gateway/jest.config.js](../../gateway/jest.config.js); `app.test.ts` mocks the proxy and cannot verify upstream path forwarding. The newer `origin/develop` includes a real proxy regression test from PWDRZ-123 and removes the proxy exclusion. Synchronize this documentation branch with `develop` before merge, then regenerate this snapshot.

#### Backend
- Focused Mockito tests mock service/repository dependencies; for example, `AuthControllerTest` uses `MockMvcBuilders.standaloneSetup` without starting Spring
- `JwtUtil` tested directly with a known test secret
- Spring tests use the PostgreSQL datasource in `src/test/resources/application-test.properties`. The default test profile disables Flyway and uses `ddl-auto=create-drop`; `@MigratedSchemaTest` overrides both settings to run real migrations in the `migration_test` schema.

---

### 5) Coverage and Quality Signals

| Module | Tool | Threshold | Reporter | Evidence |
|--------|------|-----------|----------|----------|
| Frontend | Vitest 3 | 65% lines/functions/branches/statements | text, lcov, html | [frontend/vitest.config.ts](../../frontend/vitest.config.ts) |
| Gateway | Jest 29 | 65% lines/functions/branches/statements | text, lcov, html | [gateway/jest.config.js](../../gateway/jest.config.js) |
| Backend | JaCoCo 0.8.12 | 65% line coverage | JaCoCo XML/HTML report | [backend/pom.xml](../../backend/pom.xml) |

Coverage exclusions (frontend) are defined by [vitest.config.ts](../../frontend/vitest.config.ts):
- `src/shared/**` and `src/constants/**` — shared types and static data
- `src/components/**`, `src/app/**`, `src/hooks/**`, `src/lib/**`, and `src/utils/**` — executable code currently excluded from this metric; this does **not** mean those areas have E2E coverage
- `src/test/**`, declaration files, and configuration files — test infrastructure and tooling

Known gaps:
- No E2E test suite exists; excluded components, pages, hooks, and utilities are not measured by the current Vitest threshold. PWDRZ-117 owns cross-service E2E coverage, and PWDRZ-118 owns whether the coverage scope/threshold is meaningful.
- `forumService.ts` contains typed API adapters, but `usePosts.ts` still resolves `MOCK_POSTS`; adapter tests do not prove the feed uses the backend. PWDRZ-81 owns feed integration.

---

### 6) Evidence

- [frontend/vitest.config.ts](../../frontend/vitest.config.ts)
- [gateway/jest.config.js](../../gateway/jest.config.js)
- [backend/src/test/resources/application-test.properties](../../backend/src/test/resources/application-test.properties)
- [backend/src/test/java/com/devpulse/support/MigratedSchemaTest.java](../../backend/src/test/java/com/devpulse/support/MigratedSchemaTest.java)
- [frontend/src/hooks/usePosts.ts](../../frontend/src/hooks/usePosts.ts)
- [.github/workflows/test.yml](../../.github/workflows/test.yml)
- [backend/pom.xml](../../backend/pom.xml)
