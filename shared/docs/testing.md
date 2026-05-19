# Testing

Every workspace has its own runner. The three rules below apply everywhere:

1. **Tests live next to or mirror the production tree.** A class at
   `…/forum/service/PostService.java` has its test at
   `…/forum/service/PostServiceTest.java`.
2. **Coverage gates are not advisory.** A PR that drops coverage below the
   configured threshold is failing CI and must be fixed before merge.
3. **Tests are written in English.** Test method names describe behaviour, not
   implementation details.

## Backend — JUnit 5 + Mockito + Spring Boot Test

| Concern               | Choice                                       |
| --------------------- | -------------------------------------------- |
| Runner                | JUnit 5 (`org.junit.jupiter`)                |
| Mocking               | Mockito (`@ExtendWith(MockitoExtension.class)`) |
| Assertions            | AssertJ (`assertThat`, `assertThatThrownBy`) |
| Spring integration    | `@SpringBootTest` + `MockMvcBuilders.webAppContextSetup(...).apply(springSecurity())` |
| Coverage              | JaCoCo, ≥ **65%** line coverage (see `backend/pom.xml`) |
| Excluded packages     | `BackendApplication`, `auth.dto.**`, `auth.entity.**`, `exception.**`, `config.**` |

### Naming

```
<method>_<state-or-scenario>_<expected-outcome>
```

Examples (from `AuthServiceTest`):

```
register_happyPath_returnsTokenPair
login_badCredentials_propagatesAuthenticationException
refresh_validToken_rotatesAccessAndRefreshTokens
```

### Layout

- Unit tests: pure Mockito, no Spring context — fast, used for services and
  pure helpers.
- Integration tests: `@SpringBootTest` with `@ActiveProfiles("test")` and the
  test Postgres from `docker-compose.yml`. Use these for security filter
  behaviour, controller wiring and JPA queries that you cannot validate with
  mocks alone.
- MockMvc setup: build manually from the `WebApplicationContext` and apply
  `springSecurity()`. The `@AutoConfigureMockMvc` annotation is **not on the
  classpath** in this Spring Boot 4 build.

### Anti-patterns

- Do not test getters/setters or Lombok-generated code.
- Do not assert exact strings of internal error messages — assert status code
  and an exception type only.
- Do not write a test whose only assertion is `Mockito.verify(repo).save(...)`
  unless the save is the **observable behaviour** of the method.

## Frontend — Vitest + React Testing Library

| Concern        | Choice                                |
| -------------- | ------------------------------------- |
| Runner         | Vitest 3 (`jsdom` environment)        |
| DOM helpers    | `@testing-library/react`              |
| Setup file     | `src/test/setup.ts`                   |
| Coverage       | ≥ **50%** (CI rule); the lint job runs strict TS at the same time |
| Naming         | `*.test.ts`/`*.test.tsx` next to the source, inside `__tests__/` directories |

### What to test

- Component behaviour: rendering, user interaction (`userEvent`), accessible
  roles. Avoid snapshot tests for anything dynamic.
- Hooks: render with `renderHook` and assert state transitions.
- Services / utilities: plain unit tests with the network stubbed by
  `vi.mock` or `msw`.

### Don't test

- Tailwind class strings.
- Next.js framework internals (routing, image optimisation).
- Third-party components without a wrapper of our own.

## Gateway — Jest + ts-jest

| Concern        | Choice                              |
| -------------- | ----------------------------------- |
| Runner         | Jest with `ts-jest`                 |
| Setup file     | `gateway/src/test/setup.ts`         |
| Coverage       | ≥ **65%** locally (`jest.config.js`), ≥ **50%** in CI |
| Layout         | `gateway/src/__tests__/*.test.ts`   |

Focus areas:

- Middleware composition (auth, rate limiter, error handler).
- Proxy behaviour: header forwarding, error translation.
- Config bootstrap: required env vars throw on missing values.

## Running the suites

```
# Backend (requires Postgres on :5432)
./mvnw -q -f backend/pom.xml verify

# Frontend
cd frontend && npm test            # watch mode: npm run test:watch
cd frontend && npm run test:coverage

# Gateway
cd gateway && npm test
cd gateway && npm run test:coverage
```

The `docker-compose.yml` at the repo root spins up Postgres and Redis for
local integration tests.

## When to add tests

- **Always**, for new behaviour.
- **Always**, when a bug is fixed — write the failing test first, then fix.
- Refactors with no behaviour change can rely on the existing suite, but if
  coverage drops below the threshold the PR is still red.
