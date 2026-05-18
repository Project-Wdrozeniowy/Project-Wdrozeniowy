# Testing Patterns

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
- **Database**: H2 in-memory (unit tests), real PostgreSQL via CI service container (integration tests)

```bash
cd backend
./mvnw test                          # run all tests
./mvnw test -pl backend              # from repo root
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
  - `gateway/src/__tests__/app.test.ts` — integration-level Express app test
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
| Integration | Yes (partial) | Gateway: `app.test.ts` via supertest; Backend: `AuthControllerTest` with Spring context | Backend uses real PostgreSQL in CI; H2 for local unit |
| E2E | No | — | No Playwright, Cypress, or similar found in any `package.json` |
| Visual regression | No | — | Not configured |

---

### 4) Mocking and Isolation Strategy

#### Frontend
- HTTP calls mocked with `axios-mock-adapter` — intercepts axios requests at the adapter level
- React components tested with `@testing-library/react` + jsdom; no snapshot tests observed
- Test isolation: each test file has a fresh module scope via Vitest; `localStorage` in jsdom is reset via setup or test teardown

#### Gateway
- Express middleware tested in isolation by calling handler functions directly or via `supertest`
- JWT operations mocked with Jest `jest.mock('jsonwebtoken')` or tested with real tokens (test secret in setup)
- Proxy routes excluded from coverage (`!src/routes/proxy.ts`, `!src/middleware/authGuard.ts` in [gateway/jest.config.js](../../gateway/jest.config.js)) — marked as integration-level behaviour

#### Backend
- Spring `@MockitoBean` / `@MockBean` used to mock service/repository dependencies in controller tests
- `JwtUtil` tested directly with a known test secret
- H2 in-memory database used for tests that require persistence, with `spring.jpa.hibernate.ddl-auto=create-drop` and Flyway disabled

---

### 5) Coverage and Quality Signals

| Module | Tool | Threshold | Reporter | Evidence |
|--------|------|-----------|----------|----------|
| Frontend | Vitest v8 | 65% lines/functions/branches/statements | text, lcov, html | [frontend/vitest.config.ts](../../frontend/vitest.config.ts) |
| Gateway | Jest v8 | 65% lines/functions/branches/statements | text, lcov, html | [gateway/jest.config.js](../../gateway/jest.config.js) |
| Backend | JaCoCo (Spring Boot default) | ≥50% implied by CI job name | [TODO] explicit config not found in pom.xml | [.github/workflows/test.yml](../../.github/workflows/test.yml) |

Coverage exclusions (frontend):
- `**/types/**`, `**/shared/**`, `**/constants/**` — type-only / static data
- `**/components/**`, `**/app/**`, `**/hooks/**` — UI components (marked for E2E)
- `**/test/**`, `**/mocks/**` — test infrastructure

Known gaps:
- No E2E test suite exists; components and pages have no automated coverage
- `forumService.ts` returns mocked data with `// TODO` comment — service tests may pass against mock, not real API

---

### 6) Evidence

- [frontend/vitest.config.ts](../../frontend/vitest.config.ts)
- [gateway/jest.config.js](../../gateway/jest.config.js)
- [backend/src/test/resources/application-test.properties](../../backend/src/test/resources/application-test.properties)
- [.github/workflows/test.yml](../../.github/workflows/test.yml)
- [frontend/coverage/index.html](../../frontend/coverage/index.html) — generated coverage report (committed)
- [gateway/coverage/](../../gateway/coverage/) — generated coverage report (committed)
