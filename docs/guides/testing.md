# Testing

Every workspace has its own runner. The rules below are team policy for new and
changed work; current coverage scope and the E2E gap are described separately
from that target.

1. **Tests live next to or mirror the production tree.** A class at
   `…/forum/service/PostService.java` has its test at
   `…/forum/service/PostServiceTest.java`.
2. **Coverage gates are not advisory.** A PR that drops coverage below the
   configured threshold is failing CI and must be fixed before merge.
3. **Tests are written in English.** Names describe observable behaviour.
4. **Coverage alone is insufficient.** New behaviour needs a test at a useful
   boundary, even when the aggregate percentage already passes.

## Backend — JUnit 5 + Mockito + Spring Boot Test

| Concern               | Choice                                       |
| --------------------- | -------------------------------------------- |
| Runner                | JUnit 5 (`org.junit.jupiter`)                |
| Mocking               | Mockito (`@ExtendWith(MockitoExtension.class)`) |
| Assertions            | AssertJ (`assertThat`, `assertThatThrownBy`) |
| Controller testing    | Choose `standaloneSetup` for controller-local behaviour; use a Spring context/security setup when wiring, filters, or authorization are the contract |
| Real schema           | `@MigratedSchemaTest` (`com.devpulse.support`), see below |
| Coverage              | JaCoCo, ≥ **65%** line coverage, enforced by `./mvnw verify` |
| Excluded packages     | listed in the `jacoco-maven-plugin` `check` execution in `backend/pom.xml` |

### Naming

Use descriptive camelCase method names for new Java tests, such as:

```
replayingARotatedTokenRevokesTheWholeFamily
```

Older backend tests mix camelCase and underscore-separated names. Do not
rename them as part of unrelated work; [PWDRZ-135](https://project-wdrz.atlassian.net/browse/PWDRZ-135)
owns that backend cleanup.
Frontend and gateway `it(...)` names should describe the expected behaviour
in English.

### Layout

- Unit tests: pure Mockito, no Spring context — fast, used for services and
  pure helpers.
- Integration tests: `@SpringBootTest` with `@ActiveProfiles("test")` against a
  real PostgreSQL (CI starts a `postgres:16` service; locally point
  `SPRING_DATASOURCE_URL` at any PostgreSQL 16). The test profile uses
  `ddl-auto=create-drop`, so Hibernate builds its own tables.
- Real-schema tests: annotate the class with `@MigratedSchemaTest` instead. It
  applies the Flyway migrations to a separate `migration_test` schema and runs
  Hibernate `validate` against them. Add a round-trip case for every new or
  changed mapped table and PostgreSQL enum. Use the same setup when defaults,
  constraints, SQL, or transactions depend on the real migrated schema;
  Hibernate `create-drop` cannot prove Flyway compatibility.
- MockMvc setup: `standaloneSetup` is appropriate for controller-local
  behaviour. Use `webAppContextSetup(...).apply(springSecurity())` or an
  equivalent context-backed test when framework wiring, security filters, or
  `@PreAuthorize` are the behaviour under test. No single setup is the default
  for every controller test.

### Anti-patterns

- Do not test getters/setters or Lombok-generated code.
- Do not assert exact strings of internal log messages. Asserting the
  ProblemDetail `detail` a client sees is fine; it is part of the API.
- Prefer an observable result to an interaction-only assertion such as
  `Mockito.verify(repo).save(...)`. An interaction-only test is valid when
  that interaction itself is the contract being verified.

## Frontend — Vitest + React Testing Library

| Concern        | Choice                                |
| -------------- | ------------------------------------- |
| Runner         | Vitest 3 (`jsdom` environment)        |
| DOM helpers    | `@testing-library/react`              |
| Setup file     | `src/test/setup.ts`                   |
| Coverage       | Currently ≥ **65%** lines/functions/branches/statements on included source (see `frontend/vitest.config.ts`); PWDRZ-118 will reassess the policy |
| Typecheck      | `npm run typecheck` (`tsc --noEmit`) runs as a separate step in the frontend build workflow |
| Naming         | `*.test.ts`/`*.test.tsx` next to the source, inside `__tests__/` directories |

### What to test

- New or changed **user-visible UI behaviour** needs browser-level E2E
  evidence. Existing React Testing Library tests remain valid and may help
  diagnose local behaviour, but are not a substitute for the E2E acceptance
  path. Do not require a component test for static markup alone.
- Hooks and client data-flow logic can have focused tests for state transitions.
- Services and utilities can have unit tests with the network stubbed. Choose
  a contract/integration check when an HTTP or auth boundary changes.
- Avoid snapshot tests for dynamic behaviour and assertions on Tailwind class
  strings rather than user outcomes.

### Don't test

- Tailwind class strings.
- Next.js framework internals (routing, image optimisation).
- Third-party components without a wrapper of our own.

## Gateway — Jest + ts-jest

| Concern        | Choice                              |
| -------------- | ----------------------------------- |
| Runner         | Jest with `ts-jest`                 |
| Setup file     | `gateway/src/test/setup.ts`         |
| Coverage       | Currently ≥ **65%** lines/functions/branches/statements (see `gateway/jest.config.js`); PWDRZ-118 will reassess the policy |
| Layout         | `gateway/src/__tests__/*.test.ts` and feature-local `__tests__/` folders (e.g. `src/middleware/__tests__/`) |

Focus areas:

- Middleware composition (auth, rate limiter, error handler).
- Proxy behaviour: header forwarding, error translation.
- Config bootstrap: required env vars throw on missing values.

## Running the suites

Run each line independently from the repository root:

```bash
# Backend (requires PostgreSQL; export matching POSTGRES_* and JWT_SECRET values)
cd backend && ./mvnw verify

# Frontend (single run; Vitest does not watch in the configured test script)
npm --prefix frontend test
npm --prefix frontend run test:coverage

# Gateway
npm --prefix gateway test
npm --prefix gateway run test:coverage
```

The `docker-compose.yml` at the repo root spins up Postgres and Redis for
local integration tests. The mandatory browser E2E suite and CI gate are the
target of [PWDRZ-117](https://project-wdrz.atlassian.net/browse/PWDRZ-117);
they do **not** exist yet. Until implemented, record exactly which manual or
integration path was exercised and do not claim the missing E2E gate passed.
Passing the current 65% gates is required but does not prove an excluded UI
path is tested. [PWDRZ-118](https://project-wdrz.atlassian.net/browse/PWDRZ-118)
will measure the baseline, review executable-code exclusions, choose
service-specific metrics and thresholds, and verify that the gates reject an
insufficient result. The number 65% is not the approved long-term threshold.

## When to add tests

- Add a test for new observable behaviour at the closest useful boundary.
  For a cross-service feature, also provide reproducible integration evidence;
  for a changed UI path, provide browser evidence. See the
  [Definition of Done](README.md#definition-of-done).
- A reproducible behavioural bug needs a regression test. If no automated
  test is feasible, explain the exception and the verification performed in
  the PR. Test-first is allowed, but the order of writing code and test is not
  a team requirement.
- Refactors without behaviour change can rely on the existing suite unless
  the refactor exposes an unprotected contract. The applicable coverage gate
  still must pass.
