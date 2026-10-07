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
| Spring integration    | `@SpringBootTest` + `MockMvcBuilders.standaloneSetup(controller)` for focused controller slices; `webAppContextSetup(...).apply(springSecurity())` when the full security filter chain must be exercised |
| Real schema           | `@MigratedSchemaTest` (`com.devpulse.support`), see below |
| Coverage              | JaCoCo, ≥ **65%** line coverage, enforced by `./mvnw verify` |
| Excluded packages     | listed in the `jacoco-maven-plugin` `check` execution in `backend/pom.xml` |

### Naming

Name a test after the behaviour it checks. Two styles are in use; stay
consistent within a class:

```
register_success                                 <method>_<scenario>[_<outcome>]
replayingARotatedTokenRevokesTheWholeFamily      a sentence in camelCase
```

### Layout

- Unit tests: pure Mockito, no Spring context — fast, used for services and
  pure helpers.
- Integration tests: `@SpringBootTest` with `@ActiveProfiles("test")` against a
  real PostgreSQL (CI starts a `postgres:16` service; locally point
  `SPRING_DATASOURCE_URL` at any PostgreSQL 16). The test profile uses
  `ddl-auto=create-drop`, so Hibernate builds its own tables.
- Real-schema tests: annotate the class with `@MigratedSchemaTest` instead. It
  applies the Flyway migrations to a separate `migration_test` schema and runs
  Hibernate `validate` against them. Use it for anything that depends on the
  real schema: native enum columns (`@JdbcTypeCode(SqlTypes.NAMED_ENUM)`),
  defaults, constraints, bulk updates and transactions. Add a round-trip case
  to `MigrationSchemaTest` whenever you map a new table or enum column.
- MockMvc setup: `MockMvcBuilders.standaloneSetup(controller)` is the default
  for controller tests today (see `AuthControllerTest`). For tests that need
  the full security filter chain (auth entry point, `@PreAuthorize`,
  CSRF), switch to `webAppContextSetup(context).apply(springSecurity())`.
  Both forms give explicit control over what gets wired in — prefer them
  over `@AutoConfigureMockMvc` when you want the test scope to be obvious.

### Anti-patterns

- Do not test getters/setters or Lombok-generated code.
- Do not assert exact strings of internal log messages. Asserting the
  ProblemDetail `detail` a client sees is fine; it is part of the API.
- Do not write a test whose only assertion is `Mockito.verify(repo).save(...)`
  unless the save is the **observable behaviour** of the method.

## Frontend — Vitest + React Testing Library

| Concern        | Choice                                |
| -------------- | ------------------------------------- |
| Runner         | Vitest 3 (`jsdom` environment)        |
| DOM helpers    | `@testing-library/react`              |
| Setup file     | `src/test/setup.ts`                   |
| Coverage       | ≥ **65%** lines/functions (see `frontend/vitest.config.ts`) |
| Typecheck      | `npm run typecheck` (`tsc --noEmit`) runs as a separate step in the frontend build workflow |
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
| Coverage       | ≥ **65%** lines (see `gateway/jest.config.js`)         |
| Layout         | `gateway/src/__tests__/*.test.ts` and feature-local `__tests__/` folders (e.g. `src/middleware/__tests__/`) |

Focus areas:

- Middleware composition (auth, rate limiter, error handler).
- Proxy behaviour: header forwarding, error translation.
- Config bootstrap: required env vars throw on missing values.

## Running the suites

```
# Backend (requires PostgreSQL; override SPRING_DATASOURCE_URL/USERNAME/PASSWORD if needed)
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
