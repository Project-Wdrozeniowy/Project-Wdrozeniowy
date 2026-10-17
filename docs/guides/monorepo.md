# Monorepo workflows

> [Русская версия / Russian translation ↓](#ru) — temporary reading aid;
> the English text is canonical.

## Workspace and ownership

**Nx 23.3.0 schedules tasks; npm workspaces installs Node dependencies.**
Use Node 24/npm 11, Java 17 and Docker/Compose. The [root manifest](../../package.json),
[Nx configuration](../../nx.json) and service `project.json` files define workflows.

Frontend/gateway/E2E retain their own `package.json`. Declare application libraries
in the consuming project. **The root `package-lock.json` is the only Node lockfile.**
Common Nx/Prettier live at root; service TypeScript/ESLint majors remain independent.
Deduplication must respect peer constraints. Nx was selected for its task graph,
parallel scheduling, explicit non-JavaScript projects and cache controls.
Backend targets use Maven directly; no experimental Maven plugin or Nx Cloud.
FE/BE developers own application code; the platform owner owns orchestration/CI.
No cross-service source imports or artificial shared-code packages are introduced.

## Install and develop

From the repository root:

```bash
npm run bootstrap
```

This includes the locked install and Java/Compose checks. If prerequisites are
already checked, use `npm ci` as the install-only alternative rather than running both.

Configure `.env`, `gateway/.env`, `frontend/.env` using their templates. JWT secrets
must match. Root dev expects frontend 3001, gateway 3000, backend 8080 and frontend
API URL `http://localhost:3000/api`.

Exported environment variables take precedence over `.env`, as in the service
launchers. For example, PowerShell `$env:PORT = '3000'` overrides a different
gateway port without editing its file. Remove unrelated exported overrides if
they conflict with the local workflow.

```bash
npm run dev
```

This checks configuration/ports, starts Compose PostgreSQL/Redis/backend, waits
for backend HTTP readiness, then runs frontend/gateway with hot reload through Nx.
**Do not also start the Compose gateway on port 3000.** Ctrl+C stops the owned
frontend/gateway processes. Compose services/data remain; explicitly stop them
with `docker compose stop`. No dev command deletes volumes. For custom ports/local
Java, use the direct commands in the [root README](../../README.md).

## Validate and build

| Root command           | Contract                                                                      |
| ---------------------- | ----------------------------------------------------------------------------- |
| `npm run check`        | Applicable lint, typecheck and format checks, including root tooling          |
| `npm run build`        | Frontend/gateway after typecheck; Maven package with tests skipped            |
| `npm test`             | Fresh FE/gateway coverage and Maven verify with an owned PostgreSQL container |
| `npm run test:tooling` | Workspace lifecycle and E2E infrastructure tests                              |
| `npm run test:e2e`     | Existing isolated Playwright launcher after E2E tooling checks                |
| `npm run validate`     | Service build/check/coverage requirements, tooling tests and isolated E2E     |
| `npm run graph`        | Nx project graph                                                              |

**Production frontend builds and root validation require explicit `NEXT_PUBLIC_API_URL`.**
PowerShell: `$env:NEXT_PUBLIC_API_URL = 'http://localhost:3000/api'`;
POSIX: `export NEXT_PUBLIC_API_URL=http://localhost:3000/api`.
These are local examples; deployment supplies its actual gateway URL.

Root backend coverage requires local Java 17 and Docker. It creates a randomly
named PostgreSQL 16 container, generated test credentials, tmpfs storage and an
ephemeral loopback port. Maven receives that datasource; success, failure and
handled interruption remove only the owned container. Credential-free evidence
is ignored under `.workspace-artifacts/backend/`. A machine crash cannot guarantee
cleanup: use the exact container name in `run.json`, never global Docker prune.

`npx nx run backend:coverage:ci` uses a **disposable external test DB** and requires
`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`.
CI already supplies it. Never point tests at developer/production data: test
schemas may be created/dropped.

Install Chromium using `npm exec --workspace orbita-e2e -- playwright install chromium`.
Linux may require `--with-deps`. The [E2E runbook](../../e2e/README.md) explains
isolation, scenario boundaries and the intentionally failing probe.

## Cache, CI and escape paths

**Coverage, DB/browser tests and lifecycle tasks are not cached.** Build/static
tasks use local Nx cache with project source/config, root lock/config/tool scripts
and Node version/platform inputs. Backend build also accounts for Java/options,
caching only JAR outputs rather than reports. Frontend build includes its API URL
and excludes `.next/dev` and `.next/cache` outputs. Add `--skip-nx-cache` to an Nx
command to rerun a static/build task. Remote caching is not configured.
Workspace analytics are disabled, so first-run development does not ask an
interactive telemetry question.

CI keeps individual service job names and calls scoped Nx targets. Root lockfile
controls npm caches; shared config/tool changes trigger applicable build workflows.
Affected-only skipping and GitHub required-check administration remain
[PWDRZ-137](https://project-wdrz.atlassian.net/browse/PWDRZ-137).
Edited workflow files alone do not prove published CI or branch enforcement.

After root `npm ci`, services can bypass Nx:

```bash
npm run build --workspace frontend
npm run test:coverage --workspace gateway
# Or cd frontend / cd gateway and use their existing npm scripts.
# Backend remains independent of Node:
cd backend
./mvnw verify
```

Direct frontend builds need the API URL; Maven tests need a disposable DB.
**Install Node dependencies at root; do not recreate service lockfiles.**
Gateway images use repository context: `docker build -f gateway/Dockerfile .`.
E2E copies workspace manifests/lockfile to its owned snapshot and installs the
selected frontend workspace there, excluding secrets and developer dependency trees.

<a id="ru"></a>

## Русская версия — временная вспомогательная локализация

> Каноническая версия — английский текст выше. Перевод предназначен для ранней
> разработки и должен ему соответствовать. TODO на удаление переводов:
> [PWDRZ-139](https://project-wdrz.atlassian.net/browse/PWDRZ-139).

### Workspace и ответственность

**Nx 23.3.0 управляет задачами; npm workspaces устанавливает Node-зависимости.**
Используйте Node 24/npm 11, Java 17 и Docker/Compose. Workflows задают
[корневой manifest](../../package.json), [Nx config](../../nx.json) и service `project.json`.

Frontend/gateway/E2E сохраняют `package.json`. Библиотеки объявляйте у потребителей.
**Единственный Node lockfile — корневой `package-lock.json`.** Nx/Prettier общие,
major-версии TypeScript/ESLint остаются посервисными. Дедупликация учитывает peer
constraints. Nx выбран ради графа задач, параллельности, проектов на разных языках
и управления кешем. Backend вызывает Maven напрямую; experimental Maven plugin
и Nx Cloud не нужны. FE/BE владеют application code; platform owner — orchestration/CI.
Межсервисные source imports и искусственные shared-code packages не добавляются.

### Установка и разработка

Из корня репозитория:

```bash
npm run bootstrap
```

Это locked install и проверки Java/Compose. Если prerequisites уже проверены,
используйте `npm ci` как альтернативу только для установки; обе команды подряд не нужны.

Настройте `.env`, `gateway/.env`, `frontend/.env` по шаблонам. JWT secrets должны
совпадать. Root dev ожидает frontend 3001, gateway 3000, backend 8080 и frontend
API URL `http://localhost:3000/api`.

Экспортированные переменные окружения имеют приоритет над `.env`, как и при
прямом запуске сервисов. Например, PowerShell `$env:PORT = '3000'` переопределяет
порт gateway без изменения файла. Уберите посторонние exported overrides, если
они конфликтуют с локальным workflow.

```bash
npm run dev
```

Команда проверяет config/порты, запускает Compose PostgreSQL/Redis/backend,
ждёт HTTP readiness backend и запускает frontend/gateway с hot reload через Nx.
**Не запускайте одновременно Compose gateway на 3000.** Ctrl+C останавливает
собственные frontend/gateway процессы. Compose-сервисы и данные сохраняются;
явно остановите их через `docker compose stop`. Dev не удаляет volumes.
Для своих портов/локальной Java — прямые команды [root README](../../README.md).

### Проверки и сборка

| Команда из корня       | Результат                                                           |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run check`        | Применимые lint/typecheck/format, включая root tooling              |
| `npm run build`        | Frontend/gateway после typecheck; Maven package без тестов          |
| `npm test`             | Свежие FE/gateway coverage и Maven verify с собственной PostgreSQL  |
| `npm run test:tooling` | Workspace lifecycle и E2E infrastructure tests                      |
| `npm run test:e2e`     | Существующий изолированный Playwright launcher после tooling checks |
| `npm run validate`     | Сервисные build/check/coverage, tooling tests и изолированный E2E   |
| `npm run graph`        | Граф проектов Nx                                                    |

**Production frontend build и root validate требуют явного `NEXT_PUBLIC_API_URL`.**
PowerShell: `$env:NEXT_PUBLIC_API_URL = 'http://localhost:3000/api'`;
POSIX: `export NEXT_PUBLIC_API_URL=http://localhost:3000/api`.
Это локальные примеры; deployment задаёт свой gateway URL.

Backend coverage из корня требует локальную Java 17 и Docker. Создаются случайно
названный PostgreSQL 16 container, тестовые credentials, tmpfs и временный loopback
port. Maven получает этот datasource. При успехе/ошибке/обработанном прерывании
удаляется только собственный container. Evidence без credentials — в игнорируемой
`.workspace-artifacts/backend/`. После аварии машины cleanup не гарантирован:
используйте точное имя container из `run.json`, не глобальный Docker prune.

`npx nx run backend:coverage:ci` использует **одноразовую внешнюю test DB** и требует
`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`.
CI уже предоставляет её. Не используйте developer/production data: тестовые схемы
могут создаваться и удаляться.

Установка Chromium: `npm exec --workspace orbita-e2e -- playwright install chromium`.
Linux может требовать `--with-deps`. Изоляция, границы сценариев и намеренно падающий
probe описаны в [E2E runbook](../../e2e/README.md).

### Кеш, CI и прямые команды

**Coverage, DB/browser tests и lifecycle не кешируются.** Локальный Nx cache сборок
и static checks учитывает source/config проекта, root lock/config/scripts, версию
и платформу Node. Backend build учитывает Java/options, сохраняя только JAR, не
reports. Frontend build учитывает API URL и исключает `.next/dev`/`.next/cache` outputs.
Для повторного выполнения static/build добавьте `--skip-nx-cache` к Nx-команде.
Remote caching не настроен.
Workspace analytics отключена: первый запуск не требует интерактивного ответа
на вопрос о telemetry.

CI сохраняет отдельные service job names и вызывает адресные Nx targets. Root
lockfile контролирует npm cache; общие config/tools запускают применимые builds.
Выборочный CI и required-check administration остаются
[PWDRZ-137](https://project-wdrz.atlassian.net/browse/PWDRZ-137).
Изменённый YAML сам по себе не доказывает опубликованный CI или branch enforcement.

После root `npm ci` можно обходить Nx:

```bash
npm run build --workspace frontend
npm run test:coverage --workspace gateway
# Или cd frontend / cd gateway и существующие npm scripts.
# Backend остаётся независимым от Node:
cd backend
./mvnw verify
```

Прямая frontend-сборка требует API URL, Maven tests — одноразовую БД.
**Node-зависимости устанавливайте из корня; service lockfiles не создавайте.**
Gateway image использует repository context: `docker build -f gateway/Dockerfile .`.
E2E копирует workspace manifests/lockfile в собственный snapshot и устанавливает
там frontend workspace. Секреты и developer dependency trees исключены.
