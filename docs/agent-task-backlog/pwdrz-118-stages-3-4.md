# PWDRZ-118 — расширенная область coverage и gap analysis

Дата: 2026-10-16, Europe/Warsaw. Стадия 3 и аналитическая часть стадии 4.
Новые тесты не добавлены. Существующие test suites, thresholds и workflow не изменены.
Изменения coverage scope оставлены в рабочей копии для проверки; коммита нет.

## Точка отсчёта и воспроизведение

Исходный SHA: `cc998e7ec9f627be613f902638b96cc780d4f40e`.
Рабочая ветка: `PWDRZ-118-investigate-and-enforce-meaningful-coverage-thresholds`;
она начата с этого же SHA `develop` / `origin/develop`. Production source и тесты
между измерениями не изменялись. Рабочая копия отличается тремя конфигурациями coverage.
Проверка актуальности удалённого develop из стадий 1–2 относится к 2026-10-16;
это сравнение на фиксированном SHA, а не обещание неизменности удалённой ветки.

Окружение: Windows 11 Home build 26200; Node.js 24.15.0; npm 11.12.1;
Vitest / coverage-v8 3.2.4; Jest 29.7.0 / ts-jest 29.4.9;
Temurin Java 17.0.19+10; Maven 3.9.9; JaCoCo 0.8.12;
Docker 29.4.3; PostgreSQL 16.14 (`postgres:16-alpine`). Зависимости не обновлялись.

Команды frontend и gateway из соответствующего каталога:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run test:coverage
```

Логи: `backend/target/pwdrz118-frontend-stage3.log`,
`gateway/coverage/pwdrz118-stage3.log`. Отчёты: `frontend/coverage/`,
`gateway/coverage/`, `backend/target/site/jacoco/`. Они игнорируются Git.
Лог frontend хранится вне `coverage/`: Vitest очищает этот каталог, и первая
попытка с открытым логом внутри него завершилась EBUSY до выполнения тестов.
В итоговых данных используется успешный повторный запуск.

Backend запускается на отдельной PostgreSQL без volume, порт хоста 55432,
БД/пользователь `devpulse`, тестовый пароль `pwdrz118_test_only`.
Переменные datasource, POSTGRES_* и JWT_SECRET совпадают с рецептом стадий 1–2.
Для чистого повторения после запуска этой БД из `backend/`:

```powershell
& 'C:\Users\Ruslan\.m2\wrapper\dists\apache-maven-3.9.9\3477a4f1\bin\mvn.cmd' --batch-mode '-Dmaven.repo.local=C:\Users\Ruslan\.m2\repository' '-Djacoco.destFile=target/pwdrz118-stage3-clean.exec' '-Djacoco.dataFile=target/pwdrz118-stage3-clean.exec' '-Djacoco.append=false' verify
```

Файл execution должен быть новым; `append=false` не меняет test suites или threshold.
Это защита измерения от накопления coverage между запусками. В этом запуске
report прочитал новый файл, но check проигнорировал CLI override `jacoco.dataFile`
и прочитал стандартный `target/jacoco.exec`. Поэтому затем старый стандартный файл
сохранён как `target/pwdrz118-accumulated.exec`, чистый execution скопирован в
`target/jacoco.exec` и выполнена отдельная обязательная проверка:

```powershell
Copy-Item -LiteralPath target/pwdrz118-stage3-clean.exec -Destination target/jacoco.exec
& 'C:\Users\Ruslan\.m2\wrapper\dists\apache-maven-3.9.9\3477a4f1\bin\mvn.cmd' --batch-mode '-Dmaven.repo.local=C:\Users\Ruslan\.m2\repository' 'jacoco:report@report' 'jacoco:check@check'
```

Оба последних mojo подтвердили чтение одного `target/jacoco.exec`, анализ 59
классов и успех check. XML содержит ровно одну sessioninfo `AnatarPK-7e82a876`.
SHA-256 чистого execution:
`0871926F73901C0DFFAF9DE117724CD103DC195BCFCDA6FE09D12D3576CD9215`.
Логи: `backend/target/pwdrz118-stage3-clean.log` и
`backend/target/pwdrz118-stage3-clean-check.log`. Временный PostgreSQL остановлен
и автоматически удалён; Docker Desktop, запущенный пользователем, оставлен работающим.

## Что изменено в области измерения

| Сервис | Применённая область | Что оставлено за пределами |
| --- | --- | --- |
| Frontend | Явный `coverage.include: src/**/*.{ts,tsx}`; удалены широкие `app`, `shared`, `utils` и устаревшие `components`, `hooks`, `lib`, `constants` exclusions | Тесты, test setup, declarations, зависимости, generated output и tool configs. Точных исключений для UI, иконок и констант пока нет |
| Gateway | Включён также `authGuard.ts`, чтобы измерение не скрывало исполняемый файл с неразрешённой судьбой | Только process bootstrap `src/index.ts` и declarations; type-only `src/types/index.ts` не даёт runtime counters |
| Backend | Удалены широкие `auth/dto`, `auth/entity`, `exception`, `config`, `ai`, `websocket` exclusions; report и check получили одинаковые exclusions | Только `BackendApplication.class` и `analytics/dto/**` — пять DTO без исполняемых line counters на этом SHA |

В стадии 2 `authGuard.ts` был спорным кандидатом «keep temporarily» до решения
владельца. В измерении стадии 3 выбран включающий вариант; это не решение
подключить guard к приложению. Ниже приведена чувствительность метрики к нему.
DTO-пакеты ai/websocket не исключались: без runtime counters они не меняют
знаменатель; широкая маска могла бы скрыть будущую логику.

## Baseline и изменение знаменателя

### Frontend

46/46 файлов тестов, 496/496 тестов прошли. Команда: exit 0. Прежний gate 65%
сохранился и прошёл без обхода.

| Метрика | Старые exclusions | Расширенная область | Изменение знаменателя |
| --- | ---: | ---: | ---: |
| Statements | 1344/1559 = 86,20% | 2564/3629 = 70,65% | +2070 |
| Lines | 1344/1559 = 86,20% | 2564/3629 = 70,65% | +2070 |
| Branches | 355/385 = 92,20% | 742/802 = 92,51% | +417 |
| Functions | 77/85 = 90,58% | 229/264 = 86,74% | +179 |

Line coverage снизился на 15,55 п.п. Отчёт содержит 129 production TS/TSX файлов
вместо 37: добавлены 92 файла, в том числе уже исполнявшиеся существующими тестами
(+1220 covered lines). Все 129 сверены с `git ls-files`: пропусков нет.
115 файлов имеют line counters, 14 type-only DTO имеют 0/0; 33 исполняемых файла
имеют нулевое line coverage. Всего не покрыто 1065 строк.
По областям: auth pages + schemas — 370 missed lines, dashboard — 298,
sidebar — 163. Эти три группы содержат 831 из 1065 missed lines; их бизнес-ценность
существенно различается.

Крупнейшие пропуски по missed lines:

| Файл/область | Covered/total lines | Интерпретация |
| --- | ---: | --- |
| `app/(auth)/register/page.tsx` | 0/214 | Форма и orchestration регистрации, ошибки, переходы |
| `app/(auth)/login/page.tsx` | 0/116 | Login → profile → auth state → navigation |
| `dashboard/_ui/LineChart.tsx` | 0/73 | Визуализация; бизнес-риск ниже размера файла |
| `dashboard/_ui/BarChart.tsx` | 0/48 | Визуализация с текущими mock data |
| `widgets/sidebar/ui/UserCard.tsx` | 0/47 | Представление пользователя/состояний |
| `dashboard/page.tsx` | 0/36 | Композиция mock dashboard |
| `dashboard/_lib/dashboard.const.ts` | 0/33 | Статические данные |
| `app/(main)/forum/[slug]/page.tsx` | 0/30 | Пока placeholder поста + передача slug в CommentSection |
| `shared/ui/icons.tsx` | 124/153 | 29 строк статических SVG; низкая ценность тестов ради процента |
| `features/sign-up/register.schema.ts` | 0/28 | Реальные правила валидации |
| `features/sign-in/login.schema.ts` | 0/12 | Реальные правила валидации |
| `shared/api/client/api.ts` | 102/108 | Узкие SSR/config/error branches; основной refresh flow уже проверен |

### Gateway

5/5 suites, 48/48 тестов прошли. Команда: exit 1 **только из-за branch gate**.
Coverage отчёты созданы; 65% не отключался.

| Метрика | Старые exclusions | Расширенная область | Изменение знаменателя |
| --- | ---: | ---: | ---: |
| Statements | 122/134 = 91,04% | 122/152 = 80,26% | +18 |
| Lines | 120/132 = 90,90% | 120/149 = 80,53% | +17 |
| Branches | 35/44 = 79,54% | 35/54 = 64,81% | +10 |
| Functions | 21/25 = 84,00% | 21/28 = 75,00% | +3 |

Из 12 production TS файлов 10 имеют coverage entries; отсутствуют только
точно исключённый bootstrap и type-only файл. Из 29 missed lines 17 принадлежат
неподключённому `authGuard.ts`. Оставшийся активный код: 120/132 lines и
35/44 branches — прежняя область уже включала весь активный код.

| Файл | Lines | Branches | Пробел |
| --- | ---: | ---: | --- |
| `middleware/authGuard.ts` | 0/17 | 0/10 | Не импортируется; проверяет cookie `orbita_session`, в отличие от текущей архитектуры с in-memory access token и refresh cookie |
| `routes/wsProxy.ts` | 5/9 | 0/1 | Ошибка transport proxy; реальный WS upgrade не проверен |
| `middleware/errorHandler.ts` | 14/17 | 12/15 | Raw ServerResponse fallback |
| `routes/proxy.ts` | 12/14 | 5/10 | Socket destroy и fallback req metadata |
| `middleware/rateLimiter.ts` | 5/6 | 0/0 | Пользовательский ответ 429 не исполняется тестами |
| `middleware/logger.ts` | 10/12 | 0/0 | warn/info wrappers; низкая ценность отдельно от transport/error checks |

### Backend

187/187 тестов прошли, failures/errors/skipped = 0; полный `verify` exit 0.
Итоговый отдельный check на чистом файле также exit 0. Threshold 65% не менялся.

**Исправление результатов стадий 1–2:** старый `target/jacoco.exec` содержал
пять sessioninfo, включая более ранние даты и неуспешную попытку без БД.
JaCoCo по умолчанию мог накопить probes между запусками. Поэтому 873/908
(report), 661/669 (старый check) и первый пересчёт 872/905 не являются
достоверным baseline одного успешного прогона. Сам факт 187 прошедших тестов
в старом логе остаётся подтверждённым, но его нельзя приравнивать к происхождению
всех probes. Первый пересчёт с `-DskipTests` не принят как итоговое измерение.

Для честного сравнения old-scope check пересчитывается из того же **нового**
execution/report, что и expanded check. Это устраняет влияние старых сессий.
Разница old report / new report также включает исключение bootstrap из report;
расширение check и небольшое сужение report — разные изменения.

Чистый запуск подтвердил те же counters, которые ранее получились на
накопленном файле. Это подтверждение получено экспериментом; заранее считать
старые данные чистыми было нельзя.

| Метрика | Прежняя область check, пересчёт из чистого запуска | Новая единая область report/check | Изменение знаменателя |
| --- | ---: | ---: | ---: |
| Lines | 661/669 = 98,80% | 872/905 = 96,35% | +236 |
| Branches (не gated) | 250/275 = 90,90% | 299/347 = 86,17% | +72 |
| Methods (не gated) | 184/187 = 98,39% | 241/249 = 96,78% | +62 |
| Executable classes | 47 | 59 | +12 |

Прежний полный report: 873/908 = 96,15% lines, 299/347 branches,
242/251 methods. Новый report исключает только дополнительные bootstrap
1/3 lines и 1/2 methods, поэтому report lines вырос на 0,20 п.п. Это следствие
области, а не улучшение тестов. Содержательная перемена gate — снижение
98,80% → 96,35% и добавление 236 строк в его знаменатель.
Instruction coverage новой области: 4156/4300 = 96,65%.
Полная прежняя область report отдельно перепроверена командой `jacoco:report`
на чистом execution; XML сохранён как
`backend/target/pwdrz118-stage3-full-report.xml`. После этого новый report/check
восстановлен именованными executions `report@report` / `check@check`.

Из 98 tracked Java source в XML представлены 92: 57 с line counters и
35 без executable lines. Шесть отсутствующих — точный bootstrap и пять
analytics DTO. Они сверены с инвентарём стадии 2. Все остальные production
файлы представлены; report и check используют одинаковую область.

| Файл | Covered/total lines | Covered/total branches | Основной пробел |
| --- | ---: | ---: | --- |
| `WebSocketAuthInterceptor.java` | 0/14 | 0/12 | CONNECT JWT / principal |
| `OpenApiContractCustomizer.java` | 104/108 | 42/52 | Defensive null/type paths |
| `GlobalExceptionHandler.java` | 19/23 | 2/2 | Generic 500 handler |
| `VoteService.java` | 50/53 | 25/28 | Retry exhaustion / concurrent retract |
| `PostService.java` | 142/145 | 90/95 | Category update, status visibility, constraint fallback |
| `WebSocketController.java` | 1/3 | 0/0 | Пустые TODO methods |
| `PostController.java` | 17/18 | 7/10 | Input/default branches |
| `SecurityConfig.java` | 37/38 | 0/0 | Filter-chain forbidden handler |
| `AuthenticatedUserResolver.java` | 6/7 | 3/6 | Negative security contexts |

Эти девять файлов содержат все 33 полностью missed lines. Partial instructions
могут отсутствовать и на формально covered line; branch gaps поэтому нужно
читать вместе с исходниками. В частности, RefreshToken имеет 3/3 lines, но
5/6 branches; PostSubscriptionService — 16/16 lines, но 4/6 branches.

## Ограничения метрик и проверка области

1. Frontend branch/function counters для неимпортированных файлов содержат
   synthetic empty-report entries. Например, login/register pages имеют 0 lines
   при 1/1 branch и 1/1 function. У 33 файлов с нулевыми lines всего 33 branch
   counters — это не описание всех реальных if/ternary в их исходниках.
   Поэтому 92,51% branches не означает проверку 92,51% ветвлений приложения.
   До выбора branch threshold потребуется решить, достаточно ли текущего
   инструмента, или нужен сравнительный измерительный прогон другим provider.
2. V8 lines/statement ranges включают JSX и статические данные. Большой chart
   или markup может сильнее менять процент, чем небольшой auth interceptor.
   Ранжирование рисков ниже не совпадает с сортировкой missed lines.
3. Type-only 0/0 не означает непокрытую бизнес-логику; тестировать интерфейсы ради
   процента не требуется. Java Lombok/generated methods могут фильтроваться
   JaCoCo, поэтому line coverage не доказывает проверку всех entity semantics.
4. 100% lines не доказывает полноту assertions, negative cases или contract
   compatibility. Mocked FE API и stub backend в gateway не проверяют общий
   браузерный маршрут FE → gateway → backend. Это область PWDRZ-117.
5. SQL Flyway, CSS, assets и production deployment configuration не входят в
   TS/Java line denominator. MigrationSchemaTest проверяет PostgreSQL/Flyway
   отдельно; create-drop не заменяет эту проверку.
6. Сохранившийся `analytics/dto/**` сейчас не скрывает executable lines,
   но требует повторного рассмотрения при добавлении методов. Bootstrap
   исключён точно; startup проверяется запуском приложения, а не unit coverage.
7. В логах FE остаются React act warnings. Успешный suite не означает,
   что эти предупреждения уже устранены. Это отдельный вопрос качества ожиданий.

Расхождения с исходной аналитикой: frontend 96,77% относится к более раннему
workflow/дереву, а на зафиксированном SHA прежняя область даёт 86,20% lines.
Gateway 91,04% — statements, его прежние lines равны 90,90%. Активная frontend
структура уже FSD: hooks/API находятся в `shared/api`, providers/guards — в
`app`; старые пути `src/hooks/usePosts.ts` и `src/services/forumService.ts`
не описывают этот SHA. Реальные forum feed adapters/hooks и интеграционные
component tests уже существуют; не следует планировать их повторное создание
на основании старого описания mocked feed. Backend процент теперь опубликован
в этом локальном отчёте с проверяемым чистым execution; это не утверждение,
что старый CI-лог начал публиковать эту метрику.

## Gap analysis: frontend

Оценки влияния ниже — верхние границы по текущим missed lines, а не обещание
процента после будущих тестов. В V8 ветвления и функции могут пересчитаться
после первого импорта файла. Владелец сервиса реализует поведенческие тесты;
PWDRZ-118 фиксирует scope, baseline, приоритеты и последующее обоснование gates.

| ID / приоритет | Что не проверено и риск | Уместный тест и новые сценарии | Качество / coverage | Ответственность |
| --- | --- | --- | --- | --- |
| FE-1 / высокий | Login/register pages и schemas: 0 lines. Ошибка связывания формы, payload, profile load и store может оставить пользователя с неверным состоянием сессии | RTL component + unit schemas: invalid form не отправляется; длина/формат username, password, email, confirmPassword, terms; success обновляет store и ведёт на `/`; 401 login показывает точное сообщение; 5xx/network; profile failure после полученного token; submitting предотвращает повторную отправку | Высокий эффект на auth flow; до 370 текущих missed lines в четырёх файлах (~10,20 п.п. lines), но много из них markup | FE owner; согласовать с PWDRZ-131, который уже отмечен TODO в schemas. Не делать архитектурный refactor частью spike без решения |
| FE-2 / высокий, уточнить контракт | Registration UI требует displayName и предлагает interests, но payload содержит только username/email/password. loadProfile записывает token до успешного profile response | Сначала решить ожидаемое поведение; затем проверять согласованный payload и auth cleanup при profile failure. Не закреплять возможный дефект как желаемое поведение | Устраняет риск потери введённых данных/частичной auth state; отдельный прирост от FE-1 не суммировать | FE/BE owner, отдельное исправление/контракт; PWDRZ-118 только фиксирует обнаружение |
| FE-3 / средний | API client 102/108 lines: server-side URL requirement/fallback и SSR reject path не проверены | Узкие tests в Node environment: prod без URL даёт понятную ошибку, dev fallback корректен, SSR error возвращается без browser side effects. Сначала подтвердить поддержку server-side use | Небольшой прирост, до 6 lines (~0,17 п.п.); полезно для границы runtime/config | FE owner; кандидат после auth forms |
| FE-4 / средний | Header UserActions guest branch 29/41 lines; route composition и providers/layouts не проверены вместе | Доработать существующий Header suite только для отсутствующего guest state, ссылок и displayName fallback; browser smoke login/reload/logout/protected page — в PWDRZ-117 | Component прирост небольшой; E2E высокоценен, но не обещает unit coverage delta | FE owner / PWDRZ-117 |
| FE-5 / низкий или точечный | CreatePostForm имеет 223/223 lines, 54/59 branches; CommentSection 73/73, 35/36; useVotePost 51/51, 26/27 | Разбирать только наблюдаемые gaps: повторная submit попытка пока pending, error focus, pending pagination label, отсутствующий cached page при vote success. Сверить условия с существующими тестами перед добавлением; не повторять happy path | Небольшой coverage delta; проверять устойчивость state/data flow, а не закрывать каждую defensive branch автоматически | FE owner; необязательные кандидаты после FE-1 |
| FE-6 / отложить | Dashboard charts/data, sidebar placeholders, profile tabs/skeletons, post page placeholder, icons | Сейчас не писать render/snapshot tests только ради выполнения строк. Для реального chart поведения позже: empty/single-point/zero values; для post route — реальная загрузка и not found после реализации контента | Большая доля missed lines, низкий текущий эффект на качество от механических render tests | Владельцы соответствующих feature задач; не расширять PWDRZ-118 до реализации UI |

Не предлагаются повторно: AuthGuard (17/17 lines, 10/10 branches), RoleGuard
(21/21, 14/14), AuthProvider (26/26, 10/10), tokenMemory (7/7), feed hooks и UI,
основные create-post/comment/profile flows. Существующие API client tests уже
проверяют Bearer, отсутствие localStorage, refresh single-flight, retry once,
refresh failure, повторный 401, 4xx/5xx/network и skipErrorToast. Browser-level
проверка этих контрактов остаётся полезной, но повторять те же unit сценарии не нужно.

## Gap analysis: gateway

| ID / приоритет | Что не проверено и риск | Уместный тест и новые сценарии | Качество / coverage | Ответственность |
| --- | --- | --- | --- | --- |
| GW-1 / решение прежде тестов | Неиспользуемый authGuard опирается на `orbita_session`; механические тесты поднимут процент без защиты текущего request flow | Выбрать удаление dead code отдельным изменением либо обосновать реальное подключение и пересмотреть cookie contract. Не подключать автоматически. Если сохраняется — явно обозначить legacy status | Решение сильнее меняет denominator, чем качество активного gateway. Его тестирование само по себе не улучшит защиту API | Gateway owner; scope decision относится к PWDRZ-118, реализация изменения к владельцу |
| GW-2 / высокий | wsProxy error callback 0 execution и нет настоящего WS/SockJS transport test; возможны зависание/неверный ответ при backend outage | Integration с реальным proxy и локальным WS/SockJS backend: доступный endpoint, недоступный backend, error для HTTP response и socket-like response, корректное завершение соединения. STOMP auth проверять на backend | Высокая ценность transport boundary; до 4 missed lines (~2,68 п.п. текущих lines); handshake проверки могут почти не увеличить coverage | Gateway owner + backend owner для STOMP; сквозной browser flow — отдельная задача/PWDRZ-117 |
| GW-3 / средний | Custom 429 handler не исполняется; пользователь может получить неверный контракт ошибки | Supertest с контролируемыми low limit/window и отдельным limiter instance: N запросов проходят, N+1 получает 429 с унифицированным body и rate headers; независимость состояния тестов | До 1 line (~0,67 п.п.), но реальная проверка abuse/error handling | Gateway owner |
| GW-4 / средний | Raw response в sendError и socket destroy в proxy не проверены; fallback req.url/method | Узкие boundary tests на transport failure: raw ServerResponse получает JSON 502, socket уничтожается ровно один раз, отсутствующие metadata не ломают error path | До 5 lines суммарно в errorHandler/proxy (~3,36 п.п.), часть ветвей; не суммировать с GW-2, если тесты пересекаются | Gateway owner |
| GW-5 / низкий | logger.warn/info wrappers не исполняются | Не писать отдельные тесты ради двух строк; покрывать только если появится требование к редактированию чувствительных данных или структурированному logging contract | Низкая ценность текущего line delta | Отложить, не обязательная работа PWDRZ-118 |

Уже есть real HTTP proxy tests: `/api` path и query, refresh/logout Cookie и
Set-Cookie в обе стороны, backend unavailable → 502. JWT, public/protected
routes, CORS, Helmet, error status/message уже проверяются. Эти проверки не нужно
предлагать заново. Дополнительная граница — реальные request body/Authorization
для protected write через proxy; обсуждать её по контракту, не по пропущенным строкам.

## Gap analysis: backend

Построчные наблюдения ниже подтверждены source и чистым отчётом. Высокое
покрытие HTTP/security/service не закрывает STOMP. BE-1 может добавить до
14 covered lines (~1,55 п.п.), BE-2 — до 3 (~0,33 п.п.), generic handler —
до 4 (~0,44 п.п.); это границы текущих missed lines, не оценка достаточности тестов.

| ID / приоритет | Что не проверено и риск | Уместный тест и новые сценарии | Качество / coverage | Ответственность |
| --- | --- | --- | --- | --- |
| BE-1 / высокий | WebSocketAuthInterceptor не исполнялся; именно он назначает principal из CONNECT JWT. Missing/invalid token сейчас может просто оставить frame без principal; ожидаемая политика доступа явно не доказана | Unit matrix для accessor null, не-CONNECT, missing/wrong Bearer, invalid/expired token, user отсутствует, token invalid/valid; затем messaging integration на реальном inbound channel: CONNECT, SUBSCRIBE/SEND и user destinations для anonymous/чужого пользователя | Высокий security эффект; 14 текущих missed lines — лишь небольшая часть риска. Нужна проверка отказа, а не только setUser | Backend owner, при необходимости отдельная security/real-time задача. PWDRZ-118 фиксирует обязательный приоритет, не реализует STOMP функциональность |
| BE-2 / высокий/средний | VoteService retry exhaustion и условный retry retract не покрыты; риск некорректного score/409 при длительном конфликте | Детерминированный service test с repository outcomes: три безуспешных insert/switch/delete, ответ 409, score не меняется; retry после conflict затем success. Реальную SQL атомарность оставить существующим migration-backed concurrency tests | Небольшой line delta, значимая защита бизнес-инвариантов; не дублировать happy/concurrent-success cases | Backend owner |
| BE-3 / средний | Generic exception handler и filter-chain 403 writer path недостаточно проверены | MVC test неожиданный exception → 500 ProblemDetail без внутренних деталей; security-chain test authenticated forbidden → 403 ProblemDetail. Не заменять реальную security config mock handler | Защита error contract и утечки деталей; несколько строк, малый общий прирост | Backend owner |
| BE-4 / средний | AuthenticatedUserResolver negative contexts; PostService update category/редкие status/constraint fallback ветви | Узкие tests: null/unauthenticated/anonymous context; удалённый principal → 404; change category invalid/valid; status/owner visibility только отсутствующие combinations; non-slug integrity violation не должен бесконечно retry | Малый line delta; полезные auth/business boundary assertions | Backend owner; сначала проверить существующие PostService/Controller tests, чтобы добавлять только недостающие combinations |
| BE-5 / низкий/средний | OpenApiContractCustomizer defensive null/schema paths | Дополнить узкими unit cases только поддерживаемые входы: null tags/paths, nullable property type, error responses. Published contract drift уже проверяется snapshot/contract test | Низкий риск большинства defensive branches; нет причины добиваться 100% искусственными невозможными schemas | Backend owner; необязательно для минимального пакета |
| BE-6 / отложить | WebSocketController subscribe/unsubscribe пока TODO; несколько missed lines в пустых методах | Не считать smoke вызов пустого метода проверкой subscriptions. Сценарии principal ownership, persistence, idempotency и unsubscription добавить при реализации контракта | Выполнение пустого метода увеличит coverage без функциональной гарантии | Отдельная real-time feature задача, backend owner |

Не предлагаются заново полные suites для refresh rotation, post ownership,
vote happy path, PostgreSQL enum/schema, subscription idempotency/concurrency,
OpenAPI drift: уже существуют AuthServiceRefreshIntegrationTest, AuthCookieFlowTest,
PostSecurityTest, PostServiceIntegrationTest, VoteControllerApiTest,
VoteConcurrencyTest, PostSubscriptionConcurrencyTest, MigrationSchemaTest и
OpenApiContractTest. Обычные create-drop tests и migration-backed tests имеют
разные цели; пропуски SQL semantics нельзя выводить только из Java line percentage.

## Проверки и сохранённые доказательства

Полный инвентарь новых per-file counters всех 239 production файлов:
[`pwdrz-118-stage3-file-coverage.md`](pwdrz-118-stage3-file-coverage.md).
Старый инвентарь сохранён отдельно, без перезаписи:
[`pwdrz-118-scope.csv`](pwdrz-118-scope.csv).
Исторический baseline: [`pwdrz-118-stages-1-2.md`](pwdrz-118-stages-1-2.md),
с поправкой о накопленных backend execution sessions.

Подтверждены: FE 496 tests, gateway 48 tests, backend 187 tests; clean backend
report/check; frontend/gateway lint и format:check; `git diff --check`.
Gateway format script проверяет `src`, поэтому изменённый `jest.config.js`
дополнительно проверяется непосредственно Prettier. Ни одного тестового файла,
числового threshold или workflow в diff нет. GitHub CI для этих незакоммиченных
изменений не запускался и не объявляется пройденным.

Практический блокер для будущего rollout: expanded gateway scope не проходит
старый branch gate (64,81% < 65%). Это ожидаемый измеренный результат,
а не основание незаметно снижать threshold или писать тесты legacy guard.
Решение требуется после выбора судьбы authGuard и приоритетных gaps.

## Выбор перед реализацией

Рекомендуемый первый пакет для согласования: FE-1 (auth forms/schemas), BE-1
(STOMP auth policy + tests), GW-2/GW-3 (transport failure и 429), затем BE-2/BE-3.
Это список кандидатов, не разрешение на написание тестов и не выбор thresholds.

Варианты продолжения:

1. **Риск-приоритетный пакет**: согласовать перечисленные критичные gaps,
   назначить FE/GW/BE owners и ограничить объём каждого сценариями таблиц.
2. **Минимальный scope PWDRZ-118**: оставить в spike измерение и решения по
   exclusions/gates; все поведенческие tests оформить как работу владельцев.
3. **Пакет по одному сервису**: выбрать FE, gateway или backend и согласовать
   его сценарии до начала реализации; остальные отложить.

Необходимые решения: судьба gateway authGuard; требуемая STOMP anonymous/invalid
token policy и права на destinations; registration displayName/interests contract
и cleanup при profile failure; учитывать ли текущие V8 branch counters при
будущем gate или сначала сравнить provider. Точные static UI exclusions можно
оставить пустыми — сейчас они измеряются и не скрыты. Если нужны исключения,
выбирать конкретные файлы с rationale, а не восстанавливать маски директорий.
