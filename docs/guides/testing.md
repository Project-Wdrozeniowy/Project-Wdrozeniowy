# Testing

> [Русская версия / Russian translation ↓](#ru) — temporary reading aid; the
> English text is canonical.

Every workspace has its own runner. The rules below are **team policy for new
and changed work**. Current coverage scope and the E2E gap are described
separately from that target.

1. **Tests live next to or mirror the production tree.** A class at
   `…/forum/service/PostService.java` has its test at
   `…/forum/service/PostServiceTest.java`.
2. **Coverage gates are not advisory.** A PR that drops coverage below the
   configured threshold is failing CI and must be fixed before merge.
3. **Tests are written in English.** Names describe observable behaviour.
4. **Coverage alone is insufficient.** New behaviour needs a test at a useful
   boundary, even when the aggregate percentage already passes.

## Coverage policy (PWDRZ-118)

Service-specific thresholds were selected from the expanded source baseline
and the verified risk package. Each listed metric is an independent mandatory
global gate: a higher result elsewhere cannot compensate for a failure.

| Service | Provider | Lines | Branches | Functions | Statements |
| --- | --- | --- | --- | --- | --- |
| Frontend | Istanbul, Vitest/provider 3.2.4 | 85% | 85% | 80% | 85% |
| Gateway | Jest 29 default Babel/Istanbul coverage | 95% | 85% | 90% | 95% |
| Backend | JaCoCo 0.8.12 | 95% | 85% | — | — |

The verified frontend baseline is 87.03/86.66/81.69/87.46% and the gateway
baseline is 96.99/86.95/92.30/97.03%, in the table's metric order. The selected
floors leave approximately 1.7–2.5 percentage points of headroom for frontend
and 2.0–2.3 for gateway. These deliberately tight regression floors can block
new uncovered code; they do not certify security or contract correctness.
Istanbul was selected for frontend because the pinned V8 configuration produced
misleading branch/function counters for some unimported files in the comparison.
All four frontend/gateway metrics remain mandatory; none is diagnostic-only.

Backend's clean baseline is 872/905 lines = 96.35% and 299/347 branches =
86.17%. Its independent mandatory `BUNDLE` / `COVEREDRATIO` floors of 95%
LINE and 85% BRANCH leave 1.35 and 1.17 percentage points of headroom. These
floors replace the old 65% line-only rule without requiring new Java tests.
METHOD (96.78%) and INSTRUCTION (96.65%) remain diagnostic: method invocation
does not establish conditional outcomes, while instruction coverage overlaps
source execution and is less directly readable in behavior reviews. These
JaCoCo metrics are not literal equivalents of Istanbul functions/statements.
Backend gaps in PWDRZ-156 remain backend-owned work; aggregate gates do not
certify those scenarios.

### Measured source and exclusions

- **Frontend:** `src/**/*.{ts,tsx}` in `frontend/vitest.config.ts`, including
  executable pages, components, hooks, shared code and utilities even when not
  imported by tests. Exclude `**/*.d.ts`, `src/**/__tests__/**`,
  `src/**/*.test.{ts,tsx}`, `src/**/*.spec.{ts,tsx}` and `src/test/**` because
  declarations and test infrastructure are not production behavior. Existing
  non-production exclusions `node_modules/**`, `.next/**`, `next.config.*`,
  `postcss.config.*`, `eslint.config.*`, `tailwind.config.*` and `vitest.config.*`
  are outside the explicit `src` include. No production-directory exclusion
  hides executable UI or business logic.
- **Gateway:** `src/**/*.ts` in `gateway/jest.config.js`, excluding declarations
  (`src/**/*.d.ts`) and exactly `src/index.ts`, the process bootstrap that starts
  the listener. Jest omits test files and configured setup files from coverage.
  Middleware, configuration, proxy and error-handling logic stay measured.
  The bootstrap exclusion does not exclude `app.ts` or a whole directory.
- **Backend:** compiled production classes under `backend/src/main/java`;
  identical report/check exclusions in `backend/pom.xml` omit exactly
  `com/devpulse/BackendApplication.class` (process bootstrap) and
  `com/devpulse/analytics/dto/**` (five non-executable DTO source types from the
  audit). Config, security, exceptions, controllers, services, repositories and
  executable entities remain included. Do not add executable logic to an
  excluded DTO package without revisiting that exclusion.

### CI and verification

The Tests workflow installs frontend/gateway with `npm ci`, then runs each one's
`npm run test:coverage` script. Frontend invokes `vitest run --coverage` and
gateway invokes `jest --coverage`; provider and gate values come from the
committed service configuration, not duplicated CLI thresholds. Job display
names are `Frontend Tests (coverage gates)` and `Gateway Tests (coverage gates)`;
job IDs, triggers and execution steps are unchanged. Frontend `npm test` alone
does not enable coverage; gateway `npm test` is an alias of its coverage run.

Backend's job is `Backend Tests (coverage gates)` and runs
`./mvnw --batch-mode verify` with its isolated CI PostgreSQL service. `test`
generates the report, but the JaCoCo check runs at `verify`; use `verify` for
gate verification. JaCoCo `prepare-agent` uses `append=false` so prior execution
sessions cannot inflate a later run. This is appropriate for the current
single test fork; revisit the execution-file strategy before introducing
multiple concurrent forks or separate integration-test JVMs. A skipped-test
report is not a fresh baseline.

Local full-suite passes and deliberate failures were verified for all three
services: each mandatory metric rejects an isolated 100% override, and a
reduced-test invocation fails the actual selected floors while retaining the
production denominator. Backend's final full rerun restores the report and
confirms one session with the original clean counters.
See the [decision and verification record](../agent-task-backlog/pwdrz-118-final-decisions.md)
for commands, counters, limitations and logs. The final published configuration
also passes GitHub Tests run 39043075704; negative checks were local. Historical
baseline and comparison reports remain dated evidence, not the current policy.

## Backend — JUnit 5 + Mockito + Spring Boot Test

| Concern               | Choice                                       |
| --------------------- | -------------------------------------------- |
| Runner                | JUnit 5 (`org.junit.jupiter`)                |
| Mocking               | Mockito (`@ExtendWith(MockitoExtension.class)`) |
| Assertions            | AssertJ (`assertThat`, `assertThatThrownBy`) |
| Controller testing    | Choose `standaloneSetup` for controller-local behaviour; use a Spring context/security setup when wiring, filters, or authorization are the contract |
| Real schema           | `@MigratedSchemaTest` (`com.devpulse.support`), see below |
| Coverage              | JaCoCo, LINE ≥ **95%** and BRANCH ≥ **85%**; METHOD/INSTRUCTION diagnostic; enforced by `./mvnw verify` |
| Excluded packages     | listed in the `jacoco-maven-plugin` `check` execution in `backend/pom.xml` |

### Naming

Java test methods use descriptive camelCase names, such as:

```
replayingARotatedTokenRevokesTheWholeFamily
```

Do not use underscores to separate the parts of a name
(`register_blankUsername_returns400`); all backend tests follow this since
[PWDRZ-135](https://project-wdrz.atlassian.net/browse/PWDRZ-135).
Frontend and gateway `it(...)` names should describe the expected behaviour
in English.

### Layout

- Unit tests: pure Mockito, no Spring context — fast, used for services and
  pure helpers.
- Integration tests: `@SpringBootTest` with `@ActiveProfiles("test")` against a
  real PostgreSQL (CI starts a `postgres:16` service; locally point
  `SPRING_DATASOURCE_URL` at any PostgreSQL 16). The test profile uses
  `ddl-auto=create-drop`, so Hibernate builds its own tables.
- **Real-schema tests:** annotate the class with `@MigratedSchemaTest`. It
  applies the Flyway migrations to a separate `migration_test` schema and runs
  Hibernate `validate` against them. Add a round-trip case for every new or
  changed mapped table and PostgreSQL enum. Use the same setup when defaults,
  constraints, SQL, or transactions depend on the real migrated schema;
  **Hibernate `create-drop` cannot prove Flyway compatibility.**
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
| Coverage       | Istanbul; all four [service-specific gates](#coverage-policy-pwdrz-118) are mandatory (`frontend/vitest.config.ts`) |
| Typecheck      | `npm run typecheck` (`tsc --noEmit`) runs as a separate step in the frontend build workflow |
| Naming         | `__tests__/<source-name>.test.ts(x)` in the source file's directory; distinct integration suites may use `<source-name>.integration.test.ts(x)` |

### What to test

- New or changed **user-visible UI behaviour requires browser-level E2E
  evidence**.

  Existing React Testing Library tests remain valid and may help diagnose
  local behaviour, but are not a substitute for the E2E acceptance path. Do
  not require a component test for static markup alone.
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
| Coverage       | All four [service-specific gates](#coverage-policy-pwdrz-118) are mandatory (`gateway/jest.config.js`) |
| Layout         | `__tests__/<source-name>.test.ts` beside the source (e.g. `src/config/__tests__/index.test.ts`, `src/routes/__tests__/proxy.test.ts`) |

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

The root `docker-compose.yml` starts PostgreSQL and Redis for local
integration tests.

> **Current E2E gap:** The mandatory browser suite and CI gate are tracked in
> [PWDRZ-117](https://project-wdrz.atlassian.net/browse/PWDRZ-117); they do
> **not** exist yet. Record exactly which manual or integration path was
> exercised. Do not claim the missing gate passed.

**The configured service-specific gates must pass.** Frontend executable UI
code is measured, but aggregate coverage does not prove every behavior is
tested. [PWDRZ-118](https://project-wdrz.atlassian.net/browse/PWDRZ-118) has
selected service-specific gates, confirmed by GitHub Tests run 39043075704 at
`ad268731d512e2e1838548059d43225df85a88eb`. See the
[final verification record](../agent-task-backlog/pwdrz-118-final-decisions.md#final-ci-verification-and-acceptance-sign-off)
for evidence and limitations.

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

<a id="ru"></a>

## Русская версия — временная вспомогательная локализация

> Это вспомогательный перевод для раннего этапа. **Канонический источник —
> английский текст выше.** При изменении правил обновляйте обе версии.
> Удаление русского раздела в конце проекта или при взрослении процесса:
> [PWDRZ-139](https://project-wdrz.atlassian.net/browse/PWDRZ-139).

У каждого workspace свой test runner. Правила ниже — **командная политика для
новой и изменяемой работы**. Текущее coverage и отсутствие E2E отделены от
целевого состояния.

1. **Тесты находятся рядом с кодом или повторяют его дерево.** Например,
   `…/forum/service/PostService.java` проверяется в
   `…/forum/service/PostServiceTest.java`.
2. **Coverage gates обязательны.** PR, опустившийся ниже настроенного
   порога, проваливает CI и должен быть исправлен до merge.
3. **Тесты пишутся на английском.** Имена описывают наблюдаемое поведение.
4. **Процента покрытия недостаточно.** Для нового поведения нужен тест на
   подходящей границе, даже если общий процент уже достаточен.

### Coverage policy (PWDRZ-118) — краткое описание

Каноническая [таблица coverage policy](#coverage-policy-pwdrz-118) выше задаёт
независимые обязательные пороги frontend и gateway. Frontend использует
Istanbul с Vitest/provider 3.2.4; gateway — стандартный Babel/Istanbul provider
Jest 29. Все четыре метрики обязательны. Пороги выбраны близко к измеренному
baseline и могут блокировать добавление непокрытого кода; высокий процент не
доказывает корректность security или API contract.

Frontend измеряет `src/**/*.{ts,tsx}`, включая не импортированные тестами
pages, components, hooks и shared logic; исключаются declaration/test/setup
и непроизводственные tooling/generated paths, перечисленные выше. Gateway
измеряет `src/**/*.ts`, исключая declarations и точный process bootstrap
`src/index.ts`; Jest также не измеряет test/setup files. Широких исключений
production-директорий нет во frontend/gateway. Для backend обязательны LINE
≥95% и BRANCH ≥85%; METHOD и INSTRUCTION диагностические и не являются
прямыми аналогами Istanbul functions/statements. Чистый baseline — 96,35%
lines и 86,17% branches; запас небольшой, выбран для защиты достигнутого
покрытия. Java gaps в PWDRZ-156 остаются ответственностью backend-разработчика.
Из backend report/check одинаково исключены только точный bootstrap
`com/devpulse/BackendApplication.class` и пакет пяти неисполняемых analytics
DTO `com/devpulse/analytics/dto/**`. Остальная исполняемая production-логика
входит в измерение; появление логики в исключённом DTO-пакете требует ревизии.

CI выполняет `npm ci` и существующий `npm run test:coverage` каждого сервиса;
значения берутся из конфигурации. Названия jobs — `Frontend Tests (coverage gates)`
и `Gateway Tests (coverage gates)`. Backend job — `Backend Tests (coverage gates)`,
запускает `./mvnw --batch-mode verify` с отдельной PostgreSQL в CI. Команда
`test` создаёт report, но gate выполняется на `verify`. `append=false` исключает
накопление старых JaCoCo sessions при текущем единственном test fork; перед
несколькими forks/JVM нужно пересмотреть стратегию execution files. Запуск с
пропущенными тестами не считается новым baseline.
Локальные pass/fail-проверки всех трёх сервисов завершены,
включая отказы окончательных gates при сокращённом наборе тестов с неизменным
production-знаменателем. Повторный полный backend-прогон восстановил report
и подтвердил одну session с прежними чистыми counters. Команды и ограничения — в
[журнале решений](../agent-task-backlog/pwdrz-118-final-decisions.md).
GitHub Tests run 39043075704 на SHA `ad268731d512e2e1838548059d43225df85a88eb`
подтвердил все три сервиса; ссылки — в
[финальной проверке](../agent-task-backlog/pwdrz-118-final-decisions.md#final-ci-verification-and-acceptance-sign-off).
Отрицательные проверки выполнялись локально, а не в GitHub CI.
Исторические отчёты не задают текущую политику.

### Backend — JUnit 5 + Mockito + Spring Boot Test

| Вопрос | Текущий выбор |
| --- | --- |
| Runner | JUnit 5 (`org.junit.jupiter`) |
| Mocking | Mockito (`@ExtendWith(MockitoExtension.class)`) |
| Assertions | AssertJ (`assertThat`, `assertThatThrownBy`) |
| Проверка controller | `standaloneSetup` для локального поведения controller; Spring context/security setup — когда контракт зависит от wiring, filters или authorization |
| Реальная схема | `@MigratedSchemaTest` (`com.devpulse.support`), подробности ниже |
| Coverage | JaCoCo, LINE ≥ **95%**, BRANCH ≥ **85%**; METHOD/INSTRUCTION диагностические; gate через `./mvnw verify` |
| Исключённые пакеты | Указаны в execution `check` плагина `jacoco-maven-plugin` в `backend/pom.xml` |

#### Имена

Java test methods называйте описательно в `camelCase`, например:

```text
replayingARotatedTokenRevokesTheWholeFamily
```

Не разделяйте части имени подчёркиванием
(`register_blankUsername_returns400`); с
[PWDRZ-135](https://project-wdrz.atlassian.net/browse/PWDRZ-135) так названы
все backend-тесты.
Имена `it(...)` во frontend и gateway должны по-английски описывать
ожидаемое поведение.

#### Размещение и настройка

- Unit-тесты: чистый Mockito без Spring context; быстрые проверки services
  и простых helpers.
- Integration-тесты: `@SpringBootTest` с `@ActiveProfiles("test")` против
  настоящего PostgreSQL. CI поднимает `postgres:16`; локально укажите
  `SPRING_DATASOURCE_URL` на PostgreSQL 16. Профиль использует
  `ddl-auto=create-drop`, то есть таблицы создаёт Hibernate.
- **Тест реальной схемы:** `@MigratedSchemaTest` применяет Flyway-миграции к
  отдельной схеме `migration_test` и запускает Hibernate `validate`. Для
  каждой новой/изменённой mapped table и PostgreSQL enum добавляйте
  round-trip case. Используйте такой тест и для defaults, constraints, SQL
  или transactions, когда важна настоящая migrated schema. `create-drop`
  **`create-drop` не доказывает совместимость с Flyway.**
- MockMvc: `standaloneSetup` подходит для локального поведения controller.
  Когда контракт зависит от wiring Spring, security filters или
  `@PreAuthorize`, используйте `webAppContextSetup(...).apply(springSecurity())`
  либо эквивалентный context-backed test. Универсального setup для всех
  controller tests нет.

#### Антипаттерны

- Не тестируйте getters/setters или код, сгенерированный Lombok.
- Не проверяйте точную строку внутреннего log message. Проверка
  `ProblemDetail.detail`, видимого клиенту, допустима: это часть API.
- Предпочитайте наблюдаемый результат проверке только вызова вроде
  `Mockito.verify(repo).save(...)`. Проверка взаимодействия уместна, когда
  само взаимодействие и есть проверяемый контракт.

### Frontend — Vitest + React Testing Library

| Вопрос | Текущий выбор |
| --- | --- |
| Runner | Vitest 3 (`jsdom`) |
| DOM helpers | `@testing-library/react` |
| Setup | `src/test/setup.ts` |
| Coverage | Istanbul; все четыре [посервисных gate](#coverage-policy-pwdrz-118) обязательны (`frontend/vitest.config.ts`) |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) отдельным шагом frontend build workflow |
| Имена | `__tests__/<имя-source>.test.ts(x)` в директории исходного файла; отдельный integration suite может называться `<имя-source>.integration.test.ts(x)` |

#### Что проверять

- Новое или изменённое **видимое пользователю поведение UI требует
  browser-level E2E evidence**.

  React Testing Library остаётся полезной для локальной диагностики, но не
  заменяет E2E acceptance path. Статичная разметка сама по себе не требует
  component test.
- Для hooks и client data flow полезны прицельные тесты переходов state.
- Services и utilities можно проверять unit-тестами с заглушкой сети.
  При изменении HTTP или auth boundary добавляйте contract/integration check.
- Избегайте snapshot tests для динамического поведения и проверок Tailwind
  class strings вместо результата для пользователя.

#### Что не тестировать

- Строки Tailwind-классов.
- Внутреннюю реализацию Next.js (routing, image optimisation).
- Сторонние компоненты без собственной project wrapper.

### Gateway — Jest + ts-jest

| Вопрос | Текущий выбор |
| --- | --- |
| Runner | Jest с `ts-jest` |
| Setup | `gateway/src/test/setup.ts` |
| Coverage | Все четыре [посервисных gate](#coverage-policy-pwdrz-118) обязательны (`gateway/jest.config.js`) |
| Размещение | `__tests__/<имя-source>.test.ts` рядом с исходным файлом, например `src/config/__tests__/index.test.ts`, `src/routes/__tests__/proxy.test.ts` |

Приоритетные области: композиция middleware (auth, rate limiter, error
handler); поведение proxy (передача headers, преобразование ошибок);
bootstrap config (ошибка при отсутствии обязательных env vars).

### Запуск тестов

Каждую строку запускайте независимо из корня репозитория:

```bash
# Backend: нужен PostgreSQL и согласованные POSTGRES_* / JWT_SECRET
cd backend && ./mvnw verify

# Frontend: configured script запускает Vitest один раз, без watch
npm --prefix frontend test
npm --prefix frontend run test:coverage

# Gateway
npm --prefix gateway test
npm --prefix gateway run test:coverage
```

Корневой `docker-compose.yml` поднимает PostgreSQL и Redis для локальных
integration tests.

> **Текущий пробел E2E:** Обязательный browser suite и CI gate — задача
> [PWDRZ-117](https://project-wdrz.atlassian.net/browse/PWDRZ-117); сейчас
> их **нет**. Фиксируйте, какой ручной или интеграционный путь проверен. Не
> заявляйте о прохождении отсутствующего gate.

**Настроенные посервисные gates обязательны.** Исполняемый UI-код frontend
измеряется, но общий процент не доказывает проверку каждого поведения.
В [PWDRZ-118](https://project-wdrz.atlassian.net/browse/PWDRZ-118) выбраны и
настроены посервисные gates; GitHub Tests run 39043075704 подтвердил
окончательную конфигурацию всех трёх сервисов.

### Когда добавлять тесты

- Новое наблюдаемое поведение проверяйте на ближайшей полезной границе.
  Для межсервисной функции нужно также воспроизводимое integration evidence;
  для изменённого UI-пути — браузерное. См. [Definition of Done](README.md#definition-of-done).
- Воспроизводимый поведенческий bug требует regression test. Если
  автоматизировать его невозможно, объясните исключение и выполненную
  проверку в PR. Писать тест до кода можно, но порядок не является
  обязательным правилом команды.
- Рефакторинг без изменения поведения может опираться на имеющийся suite,
  если не обнаружен незащищённый контракт. Применимый coverage gate всё
  равно должен пройти.
