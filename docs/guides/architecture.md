# Architecture and extension guide

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
Browser → Next.js frontend (:3001) → Express gateway (:3000)
        → Spring Boot backend (:8080, /api) → PostgreSQL
```

- The frontend owns presentation and client interaction. Browser API requests
  use its shared `ApiClient` and pass through the gateway, not directly to the
  backend.
- The gateway owns cross-cutting HTTP concerns such as CORS, rate limiting,
  access-token verification, and proxying. It must not become a second business
  logic or persistence layer.
- The backend owns HTTP endpoints, authorization, business rules, and database
  access. Flyway migrations own the schema; existing migrations are immutable.
- The gateway and backend intentionally verify access tokens independently.
  Both need the same JWT signing configuration. The frontend keeps access
  tokens in memory and receives refresh tokens only through an HttpOnly cookie.

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

The current frontend is **not a full Feature-Sliced Design implementation**.
For new work, group cohesive feature UI and data-flow code by responsibility
where it makes the feature easier to extend, but keep the project's central
transport and application-state boundaries:

- `src/app/` contains Next.js route files and route composition. Move form
  submission, data-fetch orchestration, and other feature behaviour into
  components or hooks rather than growing route files.
- `src/services/` owns HTTP requests and the shared `ApiClient`. Do not call
  `fetch` or Axios directly from routes or UI components. Generated contract
  bindings must preserve the existing authentication and refresh behaviour.
- `src/store/` owns shared client/application state, with slices divided by
  cohesive responsibility. Component-local display state can remain local;
  React Query owns server-cache state. Neither is a reason to duplicate the
  same shared state in a page.
- Reusable UI belongs in `src/components/`; a component used only by one
  route or feature may live next to that consumer. Keep imports through public
  interfaces where a feature boundary exists.

> **Existing gap:** These are architectural responsibilities, not a claim
> that all files comply. Login and registration routes still contain
> submission orchestration;
> [PWDRZ-131](https://project-wdrz.atlassian.net/browse/PWDRZ-131)
> owns that frontend cleanup.

The [frontend README](../../frontend/README.md) describes running the service.

## Gateway: extend the proxy only when needed

Use the existing proxy and configuration for ordinary backend API routes.
Introduce separate middleware for a genuinely cross-cutting concern; a new
resource does not automatically require its own gateway route and middleware.
Avoid copying backend business decisions into the gateway. A WebSocket or
Socket.IO integration needs an explicit end-to-end design and tests before it
is described as an available product path.

## API contract: current state and target

**Target:** One published OpenAPI contract for **implemented operations**.
Planned or `501`-only endpoints belong in Jira or a separate design reference,
not among usable published operations.
[PWDRZ-127](https://project-wdrz.atlassian.net/browse/PWDRZ-127) owns the
backend cleanup and verification.

> **Current limitation:** Until PWDRZ-127 is complete, appearance in OpenAPI
> does **not** prove availability. Check the controller, DTO, tests, and
> observed HTTP response before integrating an operation.

**Technical debt:** Frontend contract types are maintained by hand.
[PWDRZ-130](https://project-wdrz.atlassian.net/browse/PWDRZ-130) targets
derived types and endpoint bindings from corrected OpenAPI by the end of
Sprint 5, without bypassing `ApiClient`'s token/cookie/401 handling. *The
generator is not implemented yet.*

**For every API change**, align backend behaviour, the published contract,
and frontend usage. Cross-service evidence is part of the
[Definition of Done](README.md#definition-of-done).

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
Браузер → Next.js frontend (:3001) → Express gateway (:3000)
        → Spring Boot backend (:8080, /api) → PostgreSQL
```

- Frontend отвечает за представление и взаимодействие с пользователем.
  Браузерные API-запросы идут через общий `ApiClient` и gateway, не напрямую
  в backend.
- Gateway отвечает за сквозные HTTP-задачи: CORS, rate limiting, проверку
  access token и proxy. Он не должен становиться вторым слоем бизнес-логики
  или хранения данных.
- Backend отвечает за HTTP endpoints, авторизацию, бизнес-правила и БД.
  Схема принадлежит Flyway; уже применённые миграции неизменяемы.
- Gateway и backend намеренно проверяют access token независимо и должны
  использовать одинаковую конфигурацию подписи JWT. Frontend хранит access
  token только в памяти, а refresh token получает лишь через HttpOnly cookie.

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

Текущий frontend **не является полной реализацией Feature-Sliced Design**.
Для нового кода группируйте связанные UI и data-flow части по ответственности,
когда так функцию проще расширять, но сохраняйте центральные границы
transport и application state:

- `src/app/` содержит файлы маршрутов и их композицию. Submission форм,
  orchestration загрузки данных и другое feature-поведение выносите в
  компоненты или hooks, а не наращивайте route files.
- `src/services/` владеет HTTP-запросами и общим `ApiClient`. Не вызывайте
  `fetch` или Axios напрямую из routes/UI-компонентов. Сгенерированные
  contract bindings должны сохранить текущую логику auth и refresh.
- `src/store/` владеет общим клиентским/application state; slices делятся
  по связным ответственностям. Локальное display state может остаться в
  компоненте, server-cache state принадлежит React Query. Ни то ни другое
  не повод дублировать общий state в странице.
- Повторно используемый UI находится в `src/components/`; компонент одной
  route или feature может лежать рядом с потребителем. При наличии границы
  feature импортируйте через её публичный интерфейс.

> **Существующее расхождение:** Это правила ответственности, а не заявление,
> что старый код уже им следует. Login/register routes пока содержат
> submission orchestration; frontend cleanup —
> [PWDRZ-131](https://project-wdrz.atlassian.net/browse/PWDRZ-131).

Запуск сервиса описан в [frontend README](../../frontend/README.md).

### Gateway: расширяйте proxy только при необходимости

Для обычных backend API routes используйте существующие proxy и config.
Отдельное middleware добавляйте для действительно сквозной задачи; новый
resource сам по себе не требует собственного gateway route и middleware.
Не копируйте бизнес-решения backend в gateway. Интеграцию WebSocket или
Socket.IO можно назвать работающей продуктовой возможностью только после
явного end-to-end дизайна и тестов.

### API-контракт: текущее состояние и цель

**Цель:** Один опубликованный OpenAPI-контракт только для **реализованных
операций**. Планируемые и возвращающие только `501` endpoints должны быть в
Jira либо отдельном design reference, а не среди пригодных к использованию
опубликованных операций. Backend cleanup и проверка —
[PWDRZ-127](https://project-wdrz.atlassian.net/browse/PWDRZ-127).

> **Текущее ограничение:** Пока PWDRZ-127 не завершена, наличие операции в
> OpenAPI **не доказывает её доступность**. Перед интеграцией проверьте
> controller, DTO, тесты и фактический HTTP-ответ.

**Technical debt:** Сейчас frontend contract types поддерживаются вручную.
[PWDRZ-130](https://project-wdrz.atlassian.net/browse/PWDRZ-130) нацелена к
концу Sprint 5 на генерацию типов и endpoint bindings из исправленного
OpenAPI без обхода обработки token/cookie/401 в `ApiClient`. *Генератор ещё
не реализован.*

**При каждом изменении API** согласуйте backend behaviour, опубликованный
контракт и frontend usage. Подтверждение межсервисной работы входит в
[Definition of Done](README.md#definition-of-done).

### Что читать дальше

- [Правила именования](naming-conventions.md) — имена и файлы.
- [Тестирование](testing.md) — локальные, migrated-schema и межсервисные
  проверки.
- [Архитектурная карта](../codebase/ARCHITECTURE.md) и
  [карта структуры](../codebase/STRUCTURE.md) — датированный фактический
  reference.
