# Architecture and extension guide

> **Current topology:** adopted Vite/React Router SPA, Express static hosting and relative `/api`; Spring owns SESSION/CSRF. Start at the root README. Historical spike records are not current operating instructions.

> [Русская версия / Russian translation ↓](#ru) — temporary reading aid; the
> English text is canonical.

This developer-facing guide explains service boundaries and where new work
belongs. For a dated inventory of files and capabilities, use the
[codebase reference](../codebase/ARCHITECTURE.md).

**Code, configuration, tests, and Flyway migrations determine what works
today.**

## Service boundaries and request flow

Orbita currently has three independently built services in one repository:

```text
Browser → Express SPA host + /api proxy (:3000)
        → Spring Boot backend (:8080, /api) → PostgreSQL
```

- The frontend owns presentation and client interaction. Browser API requests
  use its shared `ApiClient` and pass through the gateway, not directly to the
  backend.
- The gateway owns cross-cutting HTTP concerns such as CORS, rate limiting,
  bounded HTTP forwarding, and proxying. It must not become a second business
  logic or persistence layer.
- The backend owns HTTP endpoints, authorization, business rules, and database
  access. Flyway migrations own the schema; existing migrations are immutable.
- Spring owns JDBC sessions, CSRF, authentication and current resource authorization.
  Express has no REST JWT policy or signing key. The SPA restores presentation
  through `/users/me`; see [session policy and access matrix](sessions.md).

> **Planned, not active:** Redis is provisioned in Compose but has no
> application consumer. Socket.IO is installed in the gateway but has no
> active server/client integration. Neither proves that real-time
> notifications work. The
> [capability snapshot](../codebase/ARCHITECTURE.md#capability-status)
> identifies implemented, mocked, stubbed, and deferred paths.

## Backend: extend a cohesive domain

**Place a new capability in the package that owns its domain responsibility.**
Create a top-level domain package only for a distinct responsibility, not
merely because the capability needs a controller, service, and repository.
Add only the layers it actually needs:

- Controllers describe the HTTP boundary.
- Services hold business operations.
- Repositories or other approved persistence adapters handle storage.

The backend developer owns the detailed Java design and its tests.

**Spring Data JPA is the default database access path.** Native SQL or JDBC
is acceptable when a concrete requirement warrants it. Verify mapping or SQL
behaviour against the real Flyway schema where relevant. New or changed tables
and PostgreSQL enum mappings **require a migrated-schema round-trip check**;
see the [testing guide](testing.md).

## Frontend: thin routes, shared transport and state

The [frontend architecture](frontend/README.md) owns the current route/slice map.
`app/router` composes routes, `app/layouts` owns frames, `app/providers` owns providers,
and `pages` owns screens. Widgets hold reusable regions, features own user actions,
and `shared/api` and `shared/auth` own transport/session infrastructure. Query owns
server cache; PWDRZ-150 retains profile-state consolidation. Development adds Vite
:3001 proxying `/api` through Express. Built operation needs no frontend server.

> **Existing gap:** These are architectural responsibilities, not a claim
> that all files comply. The login and registration routes are thin
> compositions; their submission orchestration lives in `features/sign-in` and
> `features/sign-up`
> ([PWDRZ-131](https://project-wdrz.atlassian.net/browse/PWDRZ-131)).

The [frontend README](../../frontend/README.md) describes running the service.

## Gateway: extend the proxy only when needed

Use the existing proxy and configuration for ordinary backend API routes.
Introduce separate middleware for a genuinely cross-cutting concern; a new
resource does not automatically require its own gateway route and middleware.
Avoid copying backend business decisions into the gateway. A WebSocket or
Socket.IO integration needs an explicit end-to-end design and tests before it
is described as an available product path.

## API contract: current state and target

The published OpenAPI contract lists **implemented operations only**. Its
committed copy, [`backend/openapi.json`](../../backend/openapi.json), is the
input for clients and code generation; the backend serves the same document
at `/api/v3/api-docs` when `SWAGGER_ENABLED=true`.

- Planned endpoints stay in their controllers as `501` stubs annotated with
  `@Hidden`, so their annotations remain the design reference. Each such
  controller names the Jira task that implements it.
- Error responses carry an RFC 9457 `ProblemDetail` body
  (`application/problem+json`). Its optional `errors` map names the request
  fields to blame, on validation errors and on errors such as a taken email
  (409). Every property of a response DTO is present;
  the ones that can be `null` are marked `@Schema(nullable = true)`.
- `OpenApiContractTest` fails when a `501` stub is published, when an
  implemented operation is hidden, or when `backend/openapi.json` differs
  from the generated document.

**For every API change**, align backend behaviour, the published contract,
and frontend usage. Regenerate the committed document from `backend/`, with
the same PostgreSQL setup as the other backend tests, and review its diff in
the PR:

```bash
./mvnw test -Dtest=OpenApiContractTest -Dopenapi.contract.update=true
```

Cross-service evidence is part of the
[Definition of Done](README.md#definition-of-done).

**Frontend bindings (PWDRZ-130):** pinned Orval generates committed DTOs,
operations and TanStack Query v5 bindings from `backend/openapi.json` into
`frontend/src/shared/api/generated/`. A custom mutator delegates to the existing
`ApiClient`, preserving cookie/CSRF/error handling. Root `api:generate` updates output;
`api:check` detects drift without repairing files. Handwritten compositions keep
application behavior; hidden `501` API contracts remain provisional. See the
[API bindings workflow](api-bindings.md) for cache policy and remaining exceptions.

## Where to look next

- [Naming conventions](naming-conventions.md) — names and file conventions.
- [Testing guide](testing.md) — local, migrated-schema, and cross-service proof.
- [Codebase architecture](../codebase/ARCHITECTURE.md) and
  [structure map](../codebase/STRUCTURE.md) — dated, factual reference.

<a id="ru"></a>

## Русская версия — временная вспомогательная локализация

> Это вспомогательный перевод для раннего этапа. **Канонический источник —
> английский текст выше.** При изменении правил обновляйте обе версии.
> Удаление русского раздела в конце проекта или при взрослении процесса:
> [PWDRZ-139](https://project-wdrz.atlassian.net/browse/PWDRZ-139).

Этот гайд объясняет границы сервисов и размещение нового кода. Датированная
карта файлов и возможностей — в
[codebase reference](../codebase/ARCHITECTURE.md).

**Реальное поведение определяют код, конфигурация, тесты и Flyway-миграции.**

### Границы сервисов и путь запроса

В одном репозитории Orbita находятся три независимо собираемых сервиса:

```text
Браузер → Express SPA host + /api proxy (:3000)
        → Spring Boot backend (:8080, /api) → PostgreSQL
```

- Frontend отвечает за представление и взаимодействие с пользователем.
  Браузерные API-запросы идут через общий `ApiClient` и gateway, не напрямую
  в backend.
- Gateway отвечает за сквозные HTTP-задачи: CORS, rate limiting, ограничения HTTP и proxy. Он не должен становиться вторым слоем бизнес-логики
  или хранения данных.
- Backend отвечает за HTTP endpoints, авторизацию, бизнес-правила и БД.
  Схема принадлежит Flyway; уже применённые миграции неизменяемы.
- Spring владеет JDBC-сессиями, CSRF и авторизацией; Express не проверяет REST JWT.
  SPA читает `/users/me`. См. [политику сессий и матрицу доступа](sessions.md).

> **Планируется, но не работает сейчас:** Redis есть в Compose, но приложение
> пока его не использует. Socket.IO установлен в gateway, однако активной
> интеграции сервера и клиента нет. Это не доказательство работающих real-time
> notifications. [Карта возможностей](../codebase/ARCHITECTURE.md#capability-status)
> различает реализованные, mock, stub и отложенные пути.

### Backend: расширяйте связный домен

**Новую возможность помещайте в пакет её предметной области.** Создавайте
top-level domain package только для самостоятельной ответственности, а не
просто потому, что понадобились controller, service и repository. Добавляйте
только необходимые слои:

- Controller описывает HTTP-границу.
- Service содержит бизнес-операции.
- Repository или другой согласованный persistence adapter отвечает за
  хранение.

Детальный Java-дизайн и тесты принадлежат backend-разработчику.

**Spring Data JPA — путь к БД по умолчанию.** Native SQL или JDBC допустимы
при конкретной необходимости. Проверяйте mapping или SQL-поведение на
реальной Flyway-схеме, когда это важно. Для новой или изменённой таблицы и
PostgreSQL enum mapping **обязателен round-trip тест с миграциями**; см.
[гайд по тестированию](testing.md).

### Frontend: тонкие routes, общий transport и state

[Frontend architecture](frontend/README.md) описывает текущие routes и slices.
`app/router` компонует routes, `app/layouts` — frames, `app/providers` — providers,
`pages` — экраны. Widgets содержат общие блоки, features — действия пользователя,
`shared/api` и `shared/auth` — transport и сессии. Query владеет server cache;
PWDRZ-150 сохраняет profile-state consolidation. В development Vite :3001 проксирует
`/api` через Express; в production Express раздаёт build без frontend server.

> **Существующее расхождение:** Это правила ответственности, а не заявление,
> что старый код уже им следует. Login/register routes теперь только
> компонуют страницу; submission orchestration находится в `features/sign-in` и
> `features/sign-up`
> ([PWDRZ-131](https://project-wdrz.atlassian.net/browse/PWDRZ-131)).

Запуск сервиса описан в [frontend README](../../frontend/README.md).

### Gateway: расширяйте proxy только при необходимости

Для обычных backend API routes используйте существующие proxy и config.
Отдельное middleware добавляйте для действительно сквозной задачи; новый
resource сам по себе не требует собственного gateway route и middleware.
Не копируйте бизнес-решения backend в gateway. Интеграцию WebSocket или
Socket.IO можно назвать работающей продуктовой возможностью только после
явного end-to-end дизайна и тестов.

### API-контракт: текущее состояние и цель

Опубликованный OpenAPI-контракт содержит **только реализованные операции**.
Его закоммиченная копия, [`backend/openapi.json`](../../backend/openapi.json),
служит входом для клиентов и генерации кода; при `SWAGGER_ENABLED=true`
backend отдаёт тот же документ по `/api/v3/api-docs`.

- Планируемые endpoints остаются в своих controllers как `501`-заглушки с
  `@Hidden`, поэтому их аннотации остаются design reference. Каждый такой
  controller называет Jira-задачу, которая его реализует.
- Ответы с ошибкой содержат RFC 9457 `ProblemDetail`
  (`application/problem+json`). Необязательная карта `errors` называет поля
  запроса, вызвавшие ошибку: при ошибках валидации и, например, при занятом
  email (409). Все свойства response DTO присутствуют в
  ответе; те, что могут быть `null`, отмечены `@Schema(nullable = true)`.
- `OpenApiContractTest` падает, если опубликована `501`-заглушка, если
  реализованная операция скрыта или если `backend/openapi.json` отличается
  от сгенерированного документа.

**При каждом изменении API** согласуйте backend behaviour, опубликованный
контракт и frontend usage. Перегенерируйте закоммиченный документ из
`backend/` (нужен тот же PostgreSQL, что и для остальных backend-тестов) и
проверьте его diff в PR:

```bash
./mvnw test -Dtest=OpenApiContractTest -Dopenapi.contract.update=true
```

Подтверждение межсервисной работы входит в
[Definition of Done](README.md#definition-of-done).

**Frontend bindings (PWDRZ-130):** закреплённый Orval генерирует DTO, операции и
TanStack Query v5 bindings из `backend/openapi.json` в committed-каталог
`frontend/src/shared/api/generated/`. Custom mutator использует существующий
`ApiClient` с обработкой cookie/CSRF/errors. Корневые `api:generate` и `api:check`
обновляют output и проверяют drift. Прикладная композиция остаётся ручной;
контракты скрытых `501` API остаются provisional. Подробности — в
[API bindings workflow](api-bindings.md).

### Что читать дальше

- [Правила именования](naming-conventions.md) — имена и файлы.
- [Тестирование](testing.md) — локальные, migrated-schema и межсервисные
  проверки.
- [Архитектурная карта](../codebase/ARCHITECTURE.md) и
  [карта структуры](../codebase/STRUCTURE.md) — датированный фактический
  reference.
