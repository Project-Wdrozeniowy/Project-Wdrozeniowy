# PWDRZ-194 → PWDRZ-167 — backend-first implementation plan

Дата корректировки: 14 ноября 2026, Europe/Warsaw.

Пользователь утвердил backend-first: сначала PWDRZ-194, затем PWDRZ-167.
Предыдущее включение UI управления публикацией было ошибкой и отменено.
Текущий запрос разрешает исправить Jira и план; остановленная реализация кода
этим исправлением автоматически не возобновляется.

- [PWDRZ-194 — Harden post unpublishing and public analytics privacy [BE]](https://project-wdrz.atlassian.net/browse/PWDRZ-194) — подзадача PWDRZ-167.
- [PWDRZ-167 — Expose public and author post engagement summaries [BE]](https://project-wdrz.atlassian.net/browse/PWDRZ-167) — родительская задача.
- Владелец и интеграция: Ruslan 82179.
- База анализа: `aa7100bc158be2e6a7712f6ecf0b2499f5bbeebd`.
- Создана рабочая ветка `PWDRZ-167-post-engagement` от обновлённого origin/develop.
  Код, staged changes и коммиты при подготовке и исправлении плана не менялись.
- Источники проверены чтением Jira, кода, контрактов и тестов. Исполнение новых
  сценариев и прохождение gates ещё не подтверждены.

## 1. Понимание задачи

Сначала подтвердить и обеспечить серверное снятие поста с публикации и
приватность его статистики (194). Затем добавить публичную и авторскую сводки
вовлечённости (167), используя уже проверенные правила публичности.

Согласованные продуктовые правила:

1. Если пост больше не публичен, его накопленная статистика не доступна
   публично. Пост и его обсуждение исключаются из соответствующих публичных
   показателей. Скрытие элементов интерфейса не заменяет запрет API.
2. Авторская история неудалённого поста остаётся личной; существующая служебная
   аналитика сохраняет свои полномочия. Непубличность не означает уничтожение
   накопленных данных или запрет автору видеть собственную историю.
3. Публичная сводка: intentional openings, реально доступные комментарии,
   рейтинг. Автор дополнительно получает количество UP и DOWN.
4. HIDDEN-ветка комментариев исключается целиком; DELETED-заглушка не считается,
   доступные VISIBLE-ответы под ней считаются.
5. Смена статуса и GET статистики не создают новых открытий.
6. Категории и их is_visible не определяют приватность поста в этих задачах.

Функциональность друзей, отдельный HIDDEN, новая модель аудиторий, UI публикации
или удаления, React Query cache policy, новые диалоги и модерация не входят.
Frontend остаётся на стороне PWDRZ-164 и связанных FE-задач; их Scope/AC не
переписываются этим планом.

## 2. Текущее состояние и повторное использование

| Механизм                                                             | Использование                                                         |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Spring SESSION/CSRF, Express `/api`                                  | Единственная серверная граница авторизации; без второго gateway guard |
| PATCH `/forum/posts/{slug}` с DRAFT/PUBLISHED                        | Уже существующее снятие и возврат публикации; не реализовывать заново |
| PostService.adjustCounters                                           | Пересчёт public post/tag counters при переходах                       |
| PostService.loadReadable                                             | Автор/ADMIN читают DRAFT; guest/чужой не читают; DELETED даёт 404     |
| PostServiceIntegrationTest.publishingAndUnpublishingMovesTheCounters | Исходный regression pattern, не доказательство нового прогона         |
| PWDRZ-165 и V10                                                      | Явный POST openings; stored view_count; legacy GET-события отделены   |
| V11 analytics_collection_starts                                      | Граница известного накопления данных, без новой таблицы               |
| PWDRZ-170 owner-only trend                                           | Сохранить owner policy, DRAFT, UTC и различие null/0                  |
| Staff `/analytics/posts/{id}`                                        | Сохранить DTO, роли и служебную семантику                             |
| Orval и committed OpenAPI                                            | Генерировать совместимые клиентские артефакты; это не FE-реализация   |

Базовый Figma-thread 197:1759 ранее просмотрен. UI не меняется, поэтому дизайн
не является prerequisite для принятия серверных контрактов.

## 3. Обнаруженные проблемы и исправления Scope

- У поста нет отдельного HIDDEN, но операция снятия с публикации уже существует.
  В текущем объёме использовать DRAFT: пользователю важен результат приватности,
  а не выбор технического enum. Новая миграция не ожидается.
- PWDRZ-194 ошибочно была создана как FE и зависела от PWDRZ-164. Исправлены
  название, Scope, AC и порядок реализации. Готовность страницы не блокирует BE.
- При финальной проверке полных Jira-ответов обеих задач ошибочная связь
  `10261` (`164 blocks 194`) отсутствует: у 194 нет issue links, у 164 нет связи
  с 194. Попытка изменения поля через коннектор вернула ошибку, а доступ
  Computer Use к браузеру не разрешён; успешное удаление не приписывается этим
  попыткам. Подтверждён именно конечный результат чтением обеих сторон.
- Stored comment_count ленты и staff count VISIBLE не равны реально доступному
  дереву. Для новых сводок использовать точный счётчик с явной семантикой.
  Переделка всех старых метрик не является целью.
- Публичный профиль копирует users.comment_count без проверки публичности
  родительского поста. Это конкретный смежный выход статистики: устранить утечку
  в 194, не меняя private own-profile totals.
- Lifetime openings — накопленные intentional openings после сброса V10.
  collectedFrom V11 не является точной реконструкцией даты запуска V10.
- Read-then-save статуса требует конкурентной проверки: нельзя предполагать
  сохранность score/comment counters и LOCKED только по последовательному тесту.

## 4. Техническое решение

### PWDRZ-194: существующий backend lifecycle

Использовать текущий PATCH со статусом и текущие Spring resource permissions.
Проверить PUBLISHED → DRAFT → PUBLISHED, прямые запросы разных ролей, CSRF,
сохранность содержимого и накопленных данных. DRAFT/DELETED не участвуют в
публичных post/activity figures. LOCKED остаётся публичным и сохраняет запрет
автору менять заблокированную публикацию.

Проверить все непосредственно связанные публичные выходы: detail, feed/search,
recommendations, public activity/categories/comparison/trending, tag counters,
публичные post/comment counters профилей и чужие subscriptions. Исправлять
подтверждённые обходы правила, не перестраивать ranking или весь user domain.
Для public profile counters использовать небольшой aggregate adapter и отдельное
public mapping; не менять shared mapping так, чтобы потерять own-profile totals.

При воспроизведении гонки status/vote/comment/moderation ограниченно исправить
действующий write path через row lock или условную запись. Не вводить generic
versioning. Сохранить существующий HTTP-контракт, насколько возможно.

### PWDRZ-167: новые сводки после принятия 194

Маршруты относительны к `/api`:

| GET                                  | Успех                                                | Отказ                                                        |
| ------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------ |
| `/analytics/public/posts/{id}`       | PUBLISHED/LOCKED, одинаковые публичные поля для всех | DRAFT/DELETED/unknown → 404, включая автора                  |
| `/analytics/me/posts/{id}`           | Только автор неудалённого поста, включая DRAFT       | Guest → 401; чужой member/staff → 404; deleted/unknown → 404 |
| Существующий `/analytics/posts/{id}` | Staff по текущему контракту                          | Существующие 401/403/404                                     |

Public DTO: postId, viewCount, commentCount, voteScore, collectedFrom.
Author DTO: те же поля плюс upvoteCount/downvoteCount. Все поля обязательны;
counts long/int64, score int, collectedFrom date-time из V11. Не возвращать
reader IDs, visitor rows, demographics, unique reach, subscriptionCount или
staff DTO, обрезаемый только на frontend.

Параметризованные агрегаты остаются в AnalyticsRepository. Проверка публичности
включена в SQL statement получения public counts; проверка owner/неудалённости
в owner query до формирования ответа. Не использовать раздельную предварительную
проверку, после которой выполняется неограниченный запрос.

viewCount берётся из posts.view_count; UP/DOWN только по post_id; score — из
действующего posts.vote_score. Для commentCount recursive CTE обходит корни
через VISIBLE/DELETED, не проходит HIDDEN, считает VISIBLE; ограничение post_id
и существующей глубины 5. Не размножать строки aggregate join-ами и не загружать
все votes/comments в Java. Нет зависимости от UI-пагинации комментариев.

Новый public GET/HEAD открывается в SecurityConfig точным matcher; `/me` остаётся
закрытым. Ошибки — ProblemDetail. Сохранить защищённую HTTP cache policy и
проверить no-store для сводок. GET/HEAD не вызывает opening writer.

## 5. Последовательность реализации и Context Map

### A. Подготовка

1. Сверить live Jira, код, актуальную base revision и staged changes. Рабочая
   ветка уже создана; не смешивать пользовательские изменения с реализацией.
2. Прочитать backlog export. Записей 194/167 там пока нет: при фактическом старте
   добавить актуальные Jira snapshots с отдельным localTracking, не переписывая
   остальные payload. Отмечать реальный статус/owner/date, не фиктивный Done.
3. Перепроверить PWDRZ-165 и baseline existing contracts. Проверить Java 17,
   Node 24/npm 11 и Docker. Последний preflight: Node 24.15.0, npm 12.0.2,
   Java 17; Docker Engine недоступен. Восстановить штатные prerequisites перед
   schema/managed-stack тестами, не ослаблять gates.

### B. Реализация и отдельное принятие PWDRZ-194

Сначала установить domain/entity rules и необходимость schema changes.
Применимые unit tests писать до соответствующей реализации и наблюдать их
ожидаемое падение; затем вносить код и добиваться pass. Integration/schema/HTTP
tests разрешено добавлять вместе с реализацией; их обязательная проверка остаётся.

1. Создать migrated fixtures и access/transition tests существующего PATCH.
2. Проверить и исправить доказанные privacy leaks существующих public APIs,
   включая public profile comment counters; сохранить private/staff semantics.
3. Контролируемыми PostgreSQL interleavings проверить status + vote/comment и
   конфликт с LOCKED; внести ограниченную защиту при найденном нарушении.
4. Проверить нулевой delta openings/events от PATCH и безопасных reads,
   сохранность slug/body/discussion/votes/openings и восстановление public totals.
5. Выполнить backend verify и HTTP integration через managed gateway. Если
   изменён executable contract, обновить OpenAPI и generated artifacts уже здесь.
6. Сохранить evidence AC 194 и логически завершённый commit. Не закрывать Jira.
   Только после подтверждения backend-поведения переходить к реализации 167.

### C. Реализация PWDRZ-167

Для новой бизнес-логики также соблюдать test-first unit цикл до реализации;
SQL/schema/security acceptance проверять отдельными integration tests.
Frontend wire types не писать вручную и JPA entities не публиковать как DTO.

1. Добавить два DTO, filtered repository projections, service mapping и GETs.
2. Добавить точный reachable commentCount, owner/public access matrix и точный
   public GET/HEAD matcher. Existing staff DTO/permissions не расширять.
3. Проверить новые endpoints после unpublish/delete и после republish; новый
   summary endpoint не должен быть prerequisite для завершения 194.
4. OpenAPI описывает поля, security, 400 для нечислового ID, 404 неизвестного
   числового ID, 401, cutoff и отсутствие записи openings от GET.
5. Из backend выполнить `.\mvnw.cmd test "-Dtest=OpenApiContractTest" "-Dopenapi.contract.update=true"`.
   Из root — `npm run api:generate`, `npm run api:check`; generated output не
   редактировать вручную. Проверить типы и существующий transport.
6. Подготовить handoff frontend-владельцам: примеры ответов, 401/404, семантика
   метрик, приватность и generated operations. Не реализовывать их UI/cache и
   не менять Scope PWDRZ-164/169/190.

### D. Итоговое принятие родителя

1. Выполнить применимые checks/build/coverage и managed integration suite на
   итоговом дереве. Root `npm run validate` остаётся общим финальным workflow;
   его существующие browser tests — regression gate, не новая UI acceptance 194.
2. Сверить каждую AC обеих BE-задач и DoD с concrete input/expected/observed/SHA.
3. Сделать targeted provisional review обеих задач и непосредственных зависимостей.
   Parent готов только вместе с принятым backend scope 194.
4. Делать логические commits и при необходимости публиковать рабочую ветку по
   выданному разрешению. Commit messages: title/body, без AI/co-author/trailers.
   Не создавать PR, не закрывать Jira без подтверждения пользователя.

### Files to Modify

| Файл / модуль                                                                                                                                                 | Изменения и владелец этапа                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `backend/src/main/java/com/devpulse/forum/service/PostService.java`, `forum/repository/PostRepository.java`                                                   | 194: bounded transition/concurrency fixes, только по подтверждённой необходимости      |
| `backend/src/main/java/com/devpulse/user/repository/PublicProfileStatsRepository.java` (new), `user/service/UserService.java`, `user/dto/UserProfileDto.java` | 194: public counts без изменения own-profile totals                                    |
| `backend/src/main/java/com/devpulse/analytics/repository/AnalyticsRepository.java`                                                                            | 194: существующая public privacy; 167: новые filtered projections и reachable comments |
| `backend/src/main/java/com/devpulse/analytics/service/AnalyticsService.java`, `analytics/controller/AnalyticsController.java`                                 | 167: новые public/owner операции                                                       |
| `backend/src/main/java/com/devpulse/analytics/dto/PublicPostEngagementDto.java`, `AuthorPostEngagementDto.java` (new)                                         | 167: отдельные разрешённые поля                                                        |
| `backend/src/main/java/com/devpulse/config/SecurityConfig.java`                                                                                               | 167: новый public GET/HEAD matcher                                                     |
| `backend/openapi.json`, `frontend/src/shared/api/generated/`                                                                                                  | Только контракт и generated client artifacts                                           |
| `docs/guides/sessions.md`, `docs/guides/api-bindings.md`, `e2e/README.md`                                                                                     | Матрица доступа, метрики, описание HTTP integration и FE handoff                       |
| `docs/agent-task-backlog/pwdrz-167-execution.md` (at implementation)                                                                                          | Отдельные evidence 194/167 и фактические gates                                         |

### Dependencies / Reference Patterns

- PostService.loadReadable/adjustCounters, existing PATCH DTO и Spring SESSION/CSRF.
- CommentService/CommentRepository — правила дерева; PostSubscriptionService —
  список читаемых подписок; RecommendationRepository — действующая публичность.
- AnalyticsRepository.publicTotals — consistent aggregate snapshot;
  @MigratedSchemaTest и existing openings/trends managed HTTP specs — реальные
  schema/security/HTTP patterns. Mock planned success не является acceptance.
- Frontend страница, cache hooks, dialogs, buttons и features/post-visibility
  удалены из карты изменений. Новых frontend query compositions не создаётся.

### Test Files

| Тест / новый файл                                                                                           | Проверка                                                  |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `backend/src/test/java/com/devpulse/forum/service/PostServiceIntegrationTest.java`                          | 194: publish/unpublish, counters и сохранность            |
| `backend/src/test/java/com/devpulse/forum/controller/PostControllerApiTest.java`, `PostOpeningApiTest.java` | 194: direct security/CSRF и нулевые побочные openings     |
| Новый migrated concurrency test в `backend/.../forum/service/`                                              | 194: контролируемая status/vote/comment/LOCKED гонка      |
| `backend/src/test/java/com/devpulse/user/controller/UserProfileApiTest.java`                                | 194: public counters против private totals                |
| `backend/src/test/java/com/devpulse/analytics/controller/AnalyticsControllerApiTest.java`                   | 167: поля, роли, статус поста и private history           |
| Новый `backend/.../analytics/repository/AnalyticsRepositoryPostEngagementTest.java`                         | 167: SQL counts/tree/status на миграциях                  |
| `backend/src/test/java/com/devpulse/config/OpenApiContractTest.java`                                        | Access metadata, отдельные схемы, drift                   |
| Существующий generated transport/types/codegen suite                                                        | Совместимость клиентских артефактов, без новой FE-функции |
| `e2e/tests/post-visibility.integration.spec.ts` (new)                                                       | 194: HTTP через gateway, без PostPage                     |
| `e2e/tests/post-engagement.integration.spec.ts` (new)                                                       | 167: новые summary API через gateway                      |

В сокращениях `backend/...` используется `backend/src/test/java/com/devpulse/`.
Breaking changes: уточнение публичных profile counters описать в контракте и
release evidence. Миграции и изменения service config/Compose/CI не ожидаются.

## 6. Проверка результата и критерии завершения

### PWDRZ-194

- Автор снимает persisted PUBLISHED пост с публикации через PATCH и возвращает
  обратно. ID/slug/body/category/tags/comments/votes/openings сохранены.
- Guest/чужой member не читает DRAFT и не получает его в публичных списках,
  recommendations и соответствующих public figures. DELETE сохраняет запрет.
- Author private history неудалённого поста и staff API сохраняют текущие права.
- Чужие mutations, missing CSRF и нарушения LOCKED/DELETED не меняют состояние;
  конкретные 401/403/404 соответствуют действующей security policy.
- Public post/tag/profile/comment counts и вклад в исторические public windows
  исчезают при unpublish и возвращаются при republish; чужие посты не затронуты.
- Конкурентные принятые votes/comments не теряют counters; moderation lock не
  обходится устаревшим status request.
- Status cycle и GET/HEAD sequence дают delta view_count/POST_VIEWED = 0;
  explicit opening POST проверяется отдельно.
- Все утверждения доказаны migrated/security/managed HTTP tests; UI не нужен.

### PWDRZ-167

Контрольный fixture: 3 openings, 3 UP и 1 DOWN (score 2); VISIBLE root A,
DELETED root B с VISIBLE child, HIDDEN root C с VISIBLE child. Ожидается public
viewCount=3, commentCount=2, voteScore=2; author получает также UP=3/DOWN=1.
Обычный count VISIBLE дал бы 3, поэтому fixture выявляет неверный SQL.

- Guest/reader/author получают одинаковый точный public field set публичного поста.
- Author endpoint: author → 200, guest → 401, чужой member/staff → 404.
- Public DRAFT/DELETED/unknown → 404 для всех, без title/body/counts.
- Author DRAFT → 200 по private policy; author DELETED/unknown → 404.
- LOCKED summary читается по обычным правам. Staff API остаётся отдельным.
- Zero activity, negative score, максимальная глубина и hidden ancestor,
  изоляция post_id, последующие votes/comments и повторные safe reads проверены.
- После unpublish/delete public summary недоступен; после republish накопленные
  значения восстановлены. GET/HEAD summaries добавляют ноль openings.
- OpenAPI и generated clients совпадают с executable behavior.

### Gates / evidence

Сначала targeted tests изменённой границы, затем backend verify и applicable
root checks/build/coverage/managed E2E; existing gates не снижать. Backend LINE

> =95%, BRANCH >=85%; frontend/gateway thresholds остаются из testing policy.
> Generated bindings проверяются api:check, codegen/transport/typecheck/format и
> применимыми существующими regressions. Новые browser flow tests не требуются;
> существующие browser regressions не отменяются. UI accessibility acceptance
> относится к будущей FE-реализации, не к этой BE-подзадаче.

Для каждой AC записать synthetic input, действие API, expected/observed output,
source SHA/dirty diff и реальные pass/fail/not-run checks. Не объявлять CI
пройденным без фактического запуска. Backend-only HTTP acceptance не называть
проверкой пользовательской страницы.

## 7. Риски, зависимости и нормативные ограничения

1. Порядок — 194 → 167. Новые endpoints родителя не блокируют принятие 194:
   в ней проверяются существующие API; новые summary cases добавляются в 167.
2. PWDRZ-165 проверяется в базе исполнения. PWDRZ-170 уже реализована в
   исследованном коде; не менять её приватность автоматически. Владелец Ivan 82288.
3. PWDRZ-164 не блокирует BE. Полная FE-интеграция, UX/cache/accessibility остаются
   будущими работами на стороне FE; их Jira Scope/AC этой корректировкой не меняются.
   PWDRZ-169 имеет собственные 164/168 зависимости: backend completion не означает
   завершения всей цепочки. Не рассылать уведомления без разрешения.
4. Проверить current-state public aggregates после смены статуса. Это защита новых
   публичных reads, а не отзыв уже скачанных сведений или очистка чужих вкладок.
   Новая real-time инфраструктура не нужна.
5. Не собирать новых tracking IDs/cookies, reader rows/demographics. Существующие
   retention/event lifecycle (PWDRZ-186) не заменять удалением истории при unpublish.
6. Применять ограничения [product vision](../project-vision.md): privacy by
   design/default, минимизацию, контроль пользователя. Ранее сверенные источники:
   [GDPR EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/),
   [польский текст UODO](https://uodo.gov.pl/data/filemanager_pl/727.pdf),
   [WCAG 2.2](https://www.w3.org/TR/WCAG22/). План не удостоверяет юридическую
   compliance всего продукта или анонимность любых aggregates. Academic/synthetic
   demo не является автоматическим освобождением от обязанностей по реальным
   аккаунтам. Новые виды tracking и deployment не добавляются; applicability
   будущего публичного развёртывания оценивается по его фактическим условиям.
7. Другие TODO/guards и владельцы не становятся автоматически нашим Scope.
   Новые существенные продуктовые противоречия уточнять, не подменять сходными
   названиями существующих механизмов.

## 8. Следующий шаг и запись корректировки

Технические enum/SQL решения не требуют повторного продуктового выбора.
Исправленный объём — только BE. Авторизация Git остаётся выданной пользователем;
PR и закрытие Jira запрещены без подтверждения. После команды продолжить код
выполнять A → B (194) → C (167) → D, без ожидания готовности PostPage.

В этой корректировке изменены описание/название 194 и этот план; отсутствие
ошибочной связи 10261 подтверждено чтением обеих задач. Status/assignee/parent
подзадачи и Scope/AC родительской/FE-задач не менялись. Параллельные изменения
AGENTS.md и developer guides, появившиеся во время работы, не редактировались
и не включались в staged. Реализация кода не возобновлялась.

Источники: [AGENTS.md](../../AGENTS.md), [architecture](../guides/architecture.md),
[sessions](../guides/sessions.md), [API bindings](../guides/api-bindings.md),
[testing](../guides/testing.md), [Git workflow](../guides/git-workflow.md), live Jira
194/167 и ранее исследованные 165/170/145/164/168/169/190. Targeted provisional
review при завершении реализации обязателен: placeholder 164 и mock FE-сценарии
не объявлять готовыми; unrelated category markers не менять. Текущая корректировка
плана не доказывает выполнение ни одной implementation AC.
