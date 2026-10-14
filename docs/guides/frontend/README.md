# Frontend architecture: PWDRZ-149 target

> [Русская версия / Russian translation ↓](#ru) — temporary reading aid; the English text is canonical.

This is the **human-facing target architecture** for the Next.js frontend. It is a migration plan, **not a description of the current directory tree**. The existing structure and runtime behaviour remain authoritative until [PWDRZ-149](https://project-wdrz.atlassian.net/browse/PWDRZ-149) is implemented. For setup, use the [frontend runbook](../../../frontend/README.md); for project-wide boundaries, use the [architecture guide](../architecture.md).

## Boundaries

Browser requests continue through the gateway to Spring Boot. The frontend owns presentation and interaction; it does not own backend business rules or duplicate HTTP contracts. The gateway remains an Express proxy and cross-cutting HTTP boundary, **not an FSD application**. Java packages and Flyway migrations remain backend-owned.

Within `frontend/src`, apply FSD only where it clarifies responsibility:

- **`app/`** keeps Next.js App Router special files, route groups, layouts, providers, guards and route composition. Route-private UI may live in `_ui/`; do not turn every route into a feature or create `_ui/` without a need. Keep route files thin.
- **`widgets/`** holds substantial, reusable page regions such as the site header and sidebar. A single route's feed does not become a widget merely because it is large.
- **`features/`** holds reusable user actions with a coherent behaviour and UI boundary: authentication actions, profile editing, comments and post interactions. `ActionButton` and `VoteButton` belong with `post-interactions`, not in a generic button collection. A feature must own meaningful behaviour, not just be a renamed component folder.
- **`shared/`** holds the API transport and server-cache access, session infrastructure, generic UI and utilities. All TanStack Query hooks and mutations — including screen-specific queries — live under `shared/api/`. Their location does not make the backend response a second source of truth.

**Do not create `pages/` or `entities/` merely to complete an FSD diagram.** Next.js already owns routing through `app/`, and the current frontend does not need an independent entity layer. Add a layer only when a real ownership boundary warrants it. Official FSD allows incremental adoption and does not require every layer ([overview](https://feature-sliced.design/docs/get-started/overview), [layers](https://feature-sliced.design/docs/reference/layers)); Next.js reserves route files and supports private folders ([project structure](https://nextjs.org/docs/app/getting-started/project-structure)). The exact combination below is a **project decision**, not an official FSD or Next.js template.

## Target tree

The tree names **intended ownership**, not directories that already exist. Omitted files stay with the nearest listed owner; create folders only when moving a real module.

The layer-level [features](../../../frontend/src/features/ABOUT.md), [widgets](../../../frontend/src/widgets/ABOUT.md), [shared](../../../frontend/src/shared/ABOUT.md), [shared API](../../../frontend/src/shared/api/ABOUT.md), and [shared auth](../../../frontend/src/shared/auth/ABOUT.md) notes explain the scaffold. They do not imply that application files have already migrated.

```text
frontend/src/
├── app/                              # Next.js-owned routes and composition
│   ├── _providers/                   # Query, auth and toast providers
│   ├── _guards/                      # Route access guards
│   ├── (auth)/                       # login and register route entries
│   ├── (main)/
│   │   ├── _ui/                      # route-group PostCard and skeleton
│   │   ├── forum/
│   │   │   ├── _ui/                  # feed, filter, pagination, states
│   │   │   └── [slug]/              # post route composition
│   │   └── (protected)/
│   │       ├── dashboard/_ui/       # dashboard-only charts and cards
│   │       └── profile/_ui/         # profile-only view and states
│   ├── globals.css
│   └── layout.tsx
├── widgets/
│   ├── site-header/ui/
│   └── site-sidebar/ui/
├── features/
│   ├── sign-in/ui/                   # after coordinated PWDRZ-131 extraction
│   ├── sign-up/ui/                   # after coordinated PWDRZ-131 extraction
│   ├── post-interactions/ui/         # ActionButton, VoteButton
│   ├── post-comments/ui/             # comment form, item, section
│   └── edit-profile/ui/              # ProfileForm
├── shared/
│   ├── api/
│   │   ├── client/                  # ApiClient, HTTP errors
│   │   ├── auth/                    # auth requests and DTOs
│   │   ├── forum/                   # post/comment requests, queries, DTOs
│   │   ├── profile/                 # profile requests, queries, mutation, DTOs
│   │   ├── analytics/               # analytics requests and DTOs
│   │   ├── notifications/           # notification requests and DTOs
│   │   └── ai/                      # AI requests and DTOs
│   ├── auth/                         # in-memory token and session lifecycle
│   ├── ui/                           # generic form field, logo, icons
│   └── lib/                          # generic formatting, URL, class-name utilities
└── test/                             # shared test setup
```

These directories show intended ownership; do not create an empty API directory if its service is only a stub or has no consumer. The authentication and registration feature folders are conditional on the separately owned route extraction; do not create empty slices in advance.

## Import and state rules

- Dependencies point downward: `app → widgets → features → shared`. A module may skip layers. **No same-layer cross-slice imports** between features or widgets. Route-private modules may use lower layers; lower layers never import a route.
- Keep slice entry surfaces explicit with direct file imports. **Do not add `index.ts` barrels solely for FSD.** Existing public `index.ts` files can remain where they have a real purpose; PWDRZ-149 explicitly preserves those exceptions. Framework special filenames remain unchanged.
- The shared `ApiClient` retains token refresh, cookie and 401 behaviour. A folder move must not create a second client or bypass the gateway.
- TanStack Query owns server-cache state. `shared/api/` contains request adapters, keys, queries and mutations; a route or feature may consume them. `shared/auth/` owns the global session/token lifecycle, not a second independently editable copy of a user profile.
- **Current gap:** `useMyProfile` caches `MyProfile` in TanStack Query while `authSlice` holds overlapping `UserProfile` in Zustand. [PWDRZ-150](https://project-wdrz.atlassian.net/browse/PWDRZ-150) owns consolidation. PWDRZ-149 may relocate these modules, but must not present the current two-copy state as the final design or silently absorb PWDRZ-150.
- Route-local display state stays local. Do not create `_model/` for every route. Use a feature `model/` segment only for genuine feature-owned client state or logic; backend-driven data remains in `shared/api/`.

## Naming and migration constraints

Use the approved role suffixes in **new or changed modules**: `<name>.type.ts` for extracted non-DTO type modules, `<name>.dto.ts` for API shapes, `<name>.const.ts` for predefined constants, and `<name>.schema.ts` for Zod schemas. Component filenames remain PascalCase; hooks remain `useThing.ts`; tests and Next.js special files retain their expected names. A module does not gain a suffix merely because it contains a `const` or a type. See [naming conventions](../naming-conventions.md) and PWDRZ-149 for scope.

Move a module with its nearby tests, update imports and any necessary explicit exports, and run typecheck, lint, format, tests and build after each cohesive batch. Preserve routes, API semantics, token handling and visible behaviour. Do not merge this structural work with new forum functionality, the [PWDRZ-130](https://project-wdrz.atlassian.net/browse/PWDRZ-130) generated-contract change, or PWDRZ-150's state redesign.

<a id="ru"></a>

## Русская версия — временная вспомогательная локализация

> Это перевод для раннего этапа разработки. **Канонический источник — английский текст выше.** Поддерживайте обе версии согласованными. Удаление временной локализации отслеживается в [PWDRZ-139](https://project-wdrz.atlassian.net/browse/PWDRZ-139).

Это **целевая архитектура frontend** на Next.js, а не описание уже существующего дерева. Переход выполняется в [PWDRZ-149](https://project-wdrz.atlassian.net/browse/PWDRZ-149). Инструкции запуска — в [frontend README](../../../frontend/README.md), общие границы сервисов — в [архитектурном гайде](../architecture.md).

### Границы

Запросы браузера по-прежнему идут через gateway в Spring Boot. Frontend отвечает за представление и взаимодействие, а не за серверные бизнес-правила. Gateway остаётся Express proxy и слоем сквозных HTTP-задач; **FSD к нему не применяется**. Java-пакеты и Flyway-миграции остаются в зоне backend.

- **`app/`** хранит обязательные файлы Next.js App Router, route groups, layouts, providers, guards и композицию маршрутов. Локальные компоненты маршрута могут лежать в `_ui/`, но такая папка не нужна каждому маршруту. Route files должны быть тонкими.
- **`widgets/`** содержит крупные повторно используемые области страницы, например header и sidebar. Компонент одной страницы не становится widget только из-за размера.
- **`features/`** содержит повторно используемые действия пользователя со связной логикой и UI: вход, регистрация, редактирование профиля, комментарии и действия с постом. `ActionButton` и `VoteButton` относятся к `post-interactions`, а не к коллекции универсальных кнопок. Feature должна иметь осмысленную ответственность.
- **`shared/`** содержит общий API transport, доступ к server cache, инфраструктуру сессии, универсальные UI и утилиты. Все TanStack Query hooks и mutations, включая экранные, размещаются в `shared/api/`. Это не делает копию ответа backend отдельным источником истины.

**Не создавайте `pages/` или `entities/` ради схемы FSD.** Next.js использует `app/` для маршрутов, а самостоятельный entity layer сейчас не нужен. FSD допускает неполный набор слоёв и постепенный переход ([overview](https://feature-sliced.design/docs/get-started/overview), [layers](https://feature-sliced.design/docs/reference/layers)); Next.js сохраняет специальные route files и private folders ([структура проекта](https://nextjs.org/docs/app/getting-started/project-structure)). Их конкретное сочетание — **решение проекта**, а не готовый официальный шаблон.

### Целевое дерево

Дерево выше показывает **будущих владельцев кода**, не уже созданные папки. Пустую API-директорию не нужно создавать, если сервис пока является только stub или у него нет потребителя. `sign-in/` и `sign-up/` появятся только при согласованном переносе из [PWDRZ-131](https://project-wdrz.atlassian.net/browse/PWDRZ-131); пустые slices заранее не создаются.

Краткие пояснения к пока пустому каркасу: [features](../../../frontend/src/features/ABOUT.md), [widgets](../../../frontend/src/widgets/ABOUT.md), [shared](../../../frontend/src/shared/ABOUT.md), [shared API](../../../frontend/src/shared/api/ABOUT.md) и [shared auth](../../../frontend/src/shared/auth/ABOUT.md). Их наличие не означает, что исходники уже перенесены.

- `app/_providers`, `app/_guards` и route-private `_ui` обслуживают Next.js-композицию.
- `widgets/site-header` и `widgets/site-sidebar` владеют повторно используемыми областями layout.
- `features/post-interactions`, `post-comments` и `edit-profile` владеют действиями пользователя.
- `shared/api` владеет общим клиентом, HTTP-адаптерами, DTO, query keys, queries и mutations; `shared/auth` — lifecycle сессии и токена; `shared/ui` и `shared/lib` — универсальными элементами.

### Импорты и состояние

- Зависимости направлены вниз: `app → widgets → features → shared`. Промежуточный слой можно пропустить. **Cross-import между slices одного слоя запрещён**; нижний слой не импортирует route.
- Публичная поверхность slice — явные прямые импорты файлов. **Не добавляйте `index.ts` только ради FSD.** Существующие полезные public entry points и специальные имена Next.js могут остаться.
- Общий `ApiClient` сохраняет refresh token, cookie и обработку 401. Перенос не должен создать второй HTTP-клиент или обход gateway.
- TanStack Query владеет серверным кешем. Hooks и mutations размещаются в `shared/api/`; route или feature использует их. `shared/auth/` хранит lifecycle сессии и токена, а не вторую самостоятельно изменяемую копию профиля.
- **Текущее расхождение:** `useMyProfile` кеширует `MyProfile` в TanStack Query, а `authSlice` хранит перекрывающийся `UserProfile` в Zustand. Устранение дублирования — [PWDRZ-150](https://project-wdrz.atlassian.net/browse/PWDRZ-150). PWDRZ-149 может переместить файлы, но не должна выдавать нынешнее состояние за конечную схему или незаметно поглощать эту работу.
- Локальное состояние отображения остаётся локальным. Не создавайте `_model/` для каждого маршрута; `model/` feature нужен только для принадлежащей ей клиентской логики. Backend-driven data живёт в `shared/api/`.

### Именование и ограничения миграции

Для **новых или изменённых модулей** применяются суффиксы по роли: `<name>.type.ts` — отдельные не-DTO типы, `<name>.dto.ts` — API shapes, `<name>.const.ts` — заранее определённые константы, `<name>.schema.ts` — Zod schemas. Имена компонентов остаются PascalCase, hooks — `useThing.ts`, а тесты и специальные файлы Next.js сохраняют необходимые имена. Одно лишь наличие `const` или типа не требует суффикса. Подробнее — в [правилах именования](../naming-conventions.md) и PWDRZ-149.

Перемещайте код вместе с соседними тестами, обновляйте импорты и необходимые exports, после каждого связного этапа запускайте typecheck, lint, format, tests и build. Сохраняйте маршруты, API-контракты, работу с токенами и пользовательское поведение. Не объединяйте структурный перенос с новой функциональностью форума, генерацией контрактов [PWDRZ-130](https://project-wdrz.atlassian.net/browse/PWDRZ-130) или изменением состояния [PWDRZ-150](https://project-wdrz.atlassian.net/browse/PWDRZ-150).
