# PWDRZ-169: план исправления соответствия дизайну

Дата: 2026-11-26. Статус: **план утверждён; реализация начата; визуальная приёмка не пройдена**.

Ветка реализации: `PWDRZ-169-fix-insights-design-implementation`.
Пользователь разрешил реализацию, новую local/upstream ветку и commits без
Co-authored-by. Ниже сохранена исходная база планирования; запрет реализации
в историческом описании этапа планирования больше не действует.

Ветка: `PWDRZ-169-fix-insights-design`, от обновлённого `origin/develop`
`e194f504ac3629db40bde86ddcf7ca6e412b7041`. Дополнительные коммиты рабочей
ветки PWDRZ-185 не включены. Создание ветки, подготовка плана и изменение
AGENTS.md разрешены пользователем. Этот этап не начинает реализацию UI, не
изменяет Jira/Figma и не создаёт commit, push или PR.

## Цель и установленная проблема

Переделать public/author insights по существующему Figma-дизайну 1:1, включая
композицию, размеры, подписи, иконки, состояния и взаимодействия. Функциональная
корректность и screenshots без прямого сравнения с эталоном не заменяют эту
приёмку. Исторические зелёные проверки PWDRZ-169 не доказывают визуальное соответствие.

В текущем develop уже есть PWDRZ-171: owner-only series, период 7/30 дней, график,
таблица и доступное исследование значений. Однако кнопка раскрытия всё ещё
ограничена `!owner`, а AuthorOpeningsTrend всегда отображается целиком. Нет
авторского compact с мини-трендом. Визуальная композиция также отличается:
порядок статистик, заголовок/период, badge, иконки, подписи и privacy block.

Live Jira PWDRZ-169 прочитана повторно: статус In testing, комментариев нет.
Задача требует design handoff и существующие контракты; это не разрешение на
собственный дизайн. Результат исправления затрагивает совместную композицию
169/171; backend daily series повторно реализовывать не требуется.

## Правило приёмки уже добавлено

В корневой AGENTS.md добавлен обязательный этап frontend design acceptance 1:1.
Отсутствующий обязательный компонент/состояние в дизайне и несогласованные
отклонения означают незавершённую задачу; это явно сообщается пользователю.
Нельзя выдавать функциональные тесты или baseline текущей реализации за
доказательство соответствия макету.

## Источник и матрица обязательных состояний

Файл Figma: `J2k3T1a2db6v51UckdUyEU`, страница `367:308`.
Developer handoff: [400:3797](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-3797).
Focus states: текст/композиция около `400:3277`; focus order: `400:3712`.

| Вариант                                  | Эталонный frame                                                                  | Визуальная приёмка |
| ---------------------------------------- | -------------------------------------------------------------------------------- | ------------------ |
| Public / Desktop / Compact               | [400:270](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-270)   | Not verified       |
| Public / Desktop / Expanded              | [400:328](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-328)   | Not verified       |
| Public / Loading                         | [400:409](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-409)   | Not verified       |
| Public / Zero                            | [400:454](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-454)   | Not verified       |
| Public / Error + Retry                   | [400:534](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-534)   | Not verified       |
| Author / Desktop / Compact               | [400:588](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-588)   | Not verified       |
| Author / Desktop / Expanded (7 days)     | [400:687](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-687)   | Not verified       |
| Author / Data table / Expanded           | [400:862](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-862)   | Not verified       |
| Author / Data table / Partially measured | [400:1086](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-1086) | Not verified       |
| Author / Desktop / Expanded (30 days)    | [400:1319](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-1319) | Not verified       |
| Author / Loading                         | [400:1542](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-1542) | Not verified       |
| Author / Zero                            | [400:1594](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-1594) | Not verified       |
| Author / Partially measured              | [400:1769](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-1769) | Not verified       |
| Author / Error + Retry                   | [400:1952](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-1952) | Not verified       |
| Public / Mobile / Compact                | [400:2012](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-2012) | Not verified       |
| Public / Mobile / Expanded               | [400:2067](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-2067) | Not verified       |
| Public / Mobile / Loading                | [400:2140](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-2140) | Not verified       |
| Public / Mobile / Zero                   | [400:2185](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-2185) | Not verified       |
| Public / Mobile / Error + Retry          | [400:2265](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-2265) | Not verified       |
| Author / Mobile / Compact                | [400:2312](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-2312) | Not verified       |
| Author / Mobile / Expanded               | [400:2413](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-2413) | Not verified       |
| Author / Mobile / 30 days                | [400:2582](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-2582) | Not verified       |
| Author / Mobile / Partially measured     | [400:2795](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-2795) | Not verified       |
| Author / Mobile / Loading                | [400:2979](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-2979) | Not verified       |
| Author / Mobile / Zero                   | [400:3034](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-3034) | Not verified       |
| Author / Mobile / Error                  | [400:3210](https://www.figma.com/design/J2k3T1a2db6v51UckdUyEU?node-id=400-3210) | Not verified       |

Это инвентаризация найденных frames, а не список уже пройденных проверок.
Для сравнения экспортировать внутреннюю UI-карточку, исключая подписи и фон
showcase. Например, author desktop compact: Card `400:601`, 672×269;
author expanded: Card `400:700`, 672×631; author mobile compact:
Card `400:2325`, 360×406; mobile expanded: Card `400:2426`, 360×824.
Отдельные showcase-состояния используют ширину 297px: их нельзя автоматически
принимать за макет полноширинного desktop-контейнера.

До реализации снять реальные значения typography, spacing, padding, border/radius,
цветов, размеров иконок и контролов, геометрии графика и таблицы с выбранных
узлов. Разница размеров showcase и внутренней карточки должна быть отражена
в manifest. Привязать каждый визуальный тест к конкретному frame/card, а не к
произвольному screenshot приложения.

## Согласованное удаление лишних элементов

В просмотренной странице дизайна нет кнопки **Refresh insights**, которую я
добавил в реализацию. Пользователь согласовал её удаление. При исправлении убрать этот самовольный
видимый элемент, сохранив безопасные повторные чтения, refresh после mutations,
focus/reload и recovery через предусмотренный Try again. Согласованное правило
совместного обновления summary/article сохраняется для соответствующих триггеров;
не добавлять замещающую кнопку/иконку собственного дизайна.

Не добавлять заменяющий Refresh control. Удаление согласовано отдельно от
расположения аналитики на странице и не означает разрешения самостоятельно
выбрать другую композицию страницы.

## Согласованное расположение: вариант Б, открытие по кнопке

Пользователь выбрал Б: сохранить место карточки между постом и комментариями,
но убрать её обязательный показ. Начальное состояние — аналитика скрыта;
в строке действий под постом справа находится кнопка Analytics. Нажатие
раскрывает карточку inline, повторное нажатие закрывает. Модальное окно,
перенос под обсуждение и изменение высоты/поведения комментариев не нужны.

Последнее уточнение пользователя: Analytics остаётся видимой на каждой
отрисованной странице поста, даже если аналитика этому посетителю недоступна.
В таком случае она серая и неактивная, с объяснением «Analytics are unavailable
for this post». Для клавиатуры сохранить focusable button с aria-disabled=true,
блокировать click/Enter/Space в обработчике; описание связать через aria-describedby.
Tooltip показывать при hover и focus, обеспечить просмотр объяснения на touch
без запуска запроса или открытия аналитики. Если tooltip реализован как popup,
он закрывается Escape и не пропадает при переводе указателя на него.
Не ограничиваться title, недоступным части пользователей. Конкретную подачу
touch-подсказки проверить на этапе preview нового согласованного control.
На not-found/error странице без отрисованного поста action row не существует —
создавать отдельную кнопку вне поста не требуется.

Недоступность определяется существующими правилами viewer/post и подтверждённым
ответом сервера, без prefetch только ради кнопки. Сетевая ошибка, 429 или 5xx
не означают «для поста нет аналитики»: они остаются ошибкой с Retry внутри
открытой карточки. Если чтение подтвердило потерю доступа, закрыть/убрать
недопустимые данные, перепроверить статью/сессию существующим механизмом и
показать неактивный trigger, пока актуальные условия не разрешают чтение.

Новый page-level trigger согласован пользователем как дополнение к существующему
дизайну. Для него переиспользовать оформление существующих action controls,
не добавлять несогласованные иконки, меню или панели. Итоговое расположение
показать в браузерном evidence. Не называть это существующим Figma frame:
карточка проходит 1:1 проверку по Figma, новый trigger — проверку по явно
согласованному дополнению и принятым стилям controls проекта.

Технический план:

- PostPage владеет состоянием видимости, PostArticle получает callback и состояние
  кнопки; использовать настоящий button с aria-expanded и aria-controls.
- До первого открытия не монтировать PostInsights и не запускать его summary/trend
  запросы. Не менять независимые запросы поста, комментариев и регистрацию opening.
- После открытия показывать compact по Figma. Внутренний Expand/Collapse карточки
  независим от внешней кнопки, которая показывает/скрывает весь блок.
- При закрытии размонтировать карточку и отсоединять observers, не очищая
  общий Query cache вручную. Polling в этих hooks сейчас отсутствует; не добавлять
  его ради этого исправления. При повторном открытии compact; обычная политика
  актуальности queries сохраняется. При смене поста/аккаунта видимость сбрасывается;
  account-scoped keys и защита от запоздалых ответов сохраняются.
- Сохранить фокус на внешней кнопке при открытии/закрытии; скрытое содержимое
  отсутствует в tab order. Не перемонтировать комментарии и не терять draft ответа.
- Проверить #comments при скрытой/открытой аналитике и при завершении её загрузки.
  useScrollToComments не удалять без проверки его оставшегося назначения;
  при необходимости уточнить комментарий с учётом необязательной аналитики.

Проверки: unit-тесты начального скрытого состояния, открытия/закрытия и сброса;
отсутствия analytics requests до клика; независимых внешнего/внутреннего раскрытий;
E2E keyboard/focus, mobile layout, comment navigation и отсутствия новых opening
events от toggle. Скрытие не считать отзывом серверного доступа или очисткой
account cache; это отдельная UI-видимость.

Реальные числовые значения, имена и даты динамические. Примерные данные Figma
не переносить в production как константы. При различии semantics/API с подписью
дизайна сначала зафиксировать конфликт; не переименовывать видимые labels или
добавлять captions самостоятельно. Статический Comments можно снабдить
невизуальным доступным объяснением его реальной семантики.

## Повторная проверка полноты плана — 2026-11-26

Проверены PostPage/PostArticle/PostInsights/AuthorOpeningsTrend, summary/series
hooks, transport AbortSignal, currentUser/QueryProvider, invalidation после
голосования/комментариев, opening delivery, scroll helper, ActivityChart и
смежные unit/integration/E2E tests. Повторно прочитан Figma handoff `400:3797`,
просмотрен author error frame `400:1952`: ошибка без показателей, отдельный Retry.
Это статическая проверка кода и эталона, не выполненная браузерная приёмка.

Выявленные дополнения к обязательным исправлениям:

1. **Доступность кнопки и идентичность страницы.** Сейчас eligibility проверяется
   только внутри PostInsights. Новый trigger должен использовать те же правила:
   для DELETED и недоступного non-public поста, включая staff, сохранять видимую
   серую неактивную кнопку с доступным объяснением, согласно последнему решению
   пользователя. Сброс видимости привязать к реальному post ID и текущему
   viewer ID, а не только owner/public: иначе смена двух non-owner аккаунтов
   не сбросит видимость. Не использовать один запоздалый effect как защиту:
   уже первый render новой идентичности должен быть закрытым. Проверка той же
   сессии не должна закрывать карточку. Общую eligibility при необходимости
   вынести в небольшой локальный helper, не создавать новый слой авторизации.

2. **ActionButton не является готовым toggle.** Текущий компонент не принимает
   onClick/aria-expanded/aria-controls и требует icon. При переиспользовании
   расширить его узким совместимым набором native button props с unit-тестами
   прежних callsites; не добавлять декоративную иконку ради обязательного prop.
   Допустима локальная кнопка из тех же tokens, если shared API менять не нужно.
   Стабильный пустой target container с ID может оставаться в DOM; summary/trend
   children до открытия не монтируются. Проверить Enter/Space, 44px target и
   доступный focus ring, mobile wrap без перекрытия Edit/Share/Save/Comments.

3. **Ошибка owner-series сейчас оформлена иначе.** AuthorOpeningsTrend использует
   getLoadPhase и отдельный refetch notice: старые дни и summary остаются видимыми
   при ошибке series. Нельзя перенести это в новую карточку как будто это Figma
   error state. Для показанных обязательных owner summary/series привести initial
   loading/error/retry к состояниям карточки из handoff; при ошибке не показывать
   старые числа/мини-график как успешные. Общий getLoadPhase и dashboard ради этого
   не менять. Проверить отдельно summary failure, series failure, оба failure,
   background failure и восстановление. Loading нового периода не должен
   показывать старые дни под новым диапазоном.

4. **Удаление Refresh затрагивает recovery, а не только JSX.** В PostInsights
   есть refreshButton ref, focus fallback, postFailed/retryingFailure и совместное
   чтение summary/article/trend. Удалить устаревшую связь с Refresh, сохранить
   single-flight Retry, безопасные ошибки и проверку результата необходимых
   reads. Успех возвращает фокус предусмотренному внутреннему expand trigger;
   если карточка закрыта/идентичность изменилась, поздний ответ не открывает её,
   не возвращает фокус и не скрывает ошибку другой карточки. Retry в полёте +
   внешнее закрытие + повторное открытие входят в race tests. Отдельно проверить
   series 404 и summary 404: устаревшая статья должна перепроверяться там, где
   отказ означает изменение доступности; 403 не превращать в logout.

5. **Семидневный compact после 30-day expanded.** Figma compact содержит Last 7
   days. Нельзя подписать 30 дневных столбцов/totalOpenings как семидневные.
   При сворачивании показывать последние семь UTC-дней подтверждённого response
   (30-day response их содержит), считать subtotal только по measured значениям;
   внутренний selected period можно сохранить для следующего раскрытия.
   Подпись диапазона compact должна соответствовать этим семи дням. Проверить
   7 → 30 → compact → expanded, null/zero/partial и отсутствие лишнего запроса
   только ради производного мини-графика. В expanded total берётся из totalOpenings,
   lifetime Openings — из summary; windowEnd API exclusive, видимый последний
   день — inclusive. Не объявлять отсутствие активности лишь по voteScore=0:
   у автора UP/DOWN могут взаимно компенсироваться; null не означает zero.

6. **Регрессии шире двух insights specs.** PostOpening.integration.test.tsx
   напрямую нажимает удаляемый Refresh; PostPage.integration.test.tsx и session
   integration тоже зависят от прежнего показа. Обновить ожидания на новый trigger,
   при этом сохранить исходный смысл: ноль дополнительных opening events,
   изоляция аккаунтов, draft комментария, #comments и независимые мутации.
   Проверить invalidation, пока карточка скрыта: accepted vote/comment помечает
   cache stale, открытие получает актуальные значения. Не заменять реальные
   E2E mocked success fixtures. Также обновить docs/guides/frontend/README.md,
   где описано прежнее поведение summary refresh.

7. **Нужна проверка полной страницы.** 26 эталонов карточки не проверяют новый
   trigger и соседей: дополнить browser evidence закрытой/открытой страницей,
   коротким/длинным постом, mobile actions и #comments. Скрытый блок не оставляет
   пустой border/padding/gap и отсутствует в accessibility tree/tab order.
   Проверить реальный размер шрифта SVG после масштабирования, не только
   fontSize=12 в viewBox. Оформление комментариев не переделывать: приложенный
   reference относится к обсуждению, а вариант Б не расширяет его scope.

Отдельно проверено: opening отправляется независимо от GET analytics и может
завершиться позже первого summary. Между независимыми reads нет atomic snapshot;
не обещать real-time синхронизацию счётчиков, не добавлять realtime/polling или
менять владельца PWDRZ-166. В проверках неизменности openings baseline фиксируется
после завершения исходной записи. При скрытии generated query signal позволяет
отменить лишний read; отмену не показывать как новую пользовательскую ошибку.

В просмотренных feature/analytics/chart файлах не найдены actionable TODO/guards,
которые нужно включить после 169/171. Comments сохраняют отдельную acceptance
ownership PWDRZ-67; менять их pagination/высоту/оформление в этот fix не требуется.
Новые backend endpoints, DTO, миграции и пересборка архитектуры не нужны по
результатам этой проверки. Полнота фактического исправления подтверждается только
после выполнения test/visual matrix; текущий документ не является таким доказательством.

## Карта изменений

Дополнительно после повторной проверки в карту входят
`pages/post/ui/__tests__/PostOpening.integration.test.tsx`,
`pages/post/ui/__tests__/PostPage.integration.test.tsx` и
`docs/guides/frontend/README.md`. Если используется общий ActionButton,
затрагиваются `features/post-interactions/ActionButton.tsx` и его unit-тесты:
нужны совместимые onClick/ARIA props и сохранение прежних потребителей.
Все указанные source paths находятся внутри frontend/src.

| Модуль                                                                        | Планируемое изменение                                                                                                                                |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| frontend/src/pages/post/ui/PostPage.tsx, PostArticle.tsx и их тесты           | Внешний trigger Analytics, начальная скрытость, независимое раскрытие, сброс видимости и сохранение обсуждения                                       |
| frontend/src/pages/post/ui/PostInsights.tsx                                   | Общая public/author оболочка, настоящий compact/expanded для автора, точная шапка/статистики/состояния и фокус                                       |
| frontend/src/pages/post/ui/AuthorOpeningsTrend.tsx                            | Композиция expanded по макету; не вставлять dashboard-обёртку с лишними контролами                                                                   |
| Новый локальный compact-render в pages/post/ui                                | Мини-тренд, период и итог того же owner series; без второго источника данных                                                                         |
| frontend/src/pages/post/config/postInsights.const.ts                          | Подписи и параметры представления из handoff; без вымышленных текстов                                                                                |
| frontend/src/pages/post/lib/openingsTrend.ts                                  | Переиспользовать отображение measured/null/partial, UTC и вычисления; проверить крайние случаи compact                                               |
| frontend/src/widgets/activity-chart                                           | Переиспользовать существующие graph/table/math через публичный API; менять только при подтверждённой необходимости, сохраняя dashboard-представление |
| frontend/src/pages/post/ui/**tests**/PostInsights.test.tsx                    | Заменить ожидания отсутствия авторского раскрытия тестами настоящих состояний                                                                        |
| frontend/src/app/providers/**tests**/postInsightsSession.integration.test.tsx | Сохранить изоляцию аккаунтов и обновить focus target согласно дизайну                                                                                |
| e2e/tests/post-insights.spec.ts, post-insights-trend.spec.ts                  | Настоящие toggle/compact/expanded/table/period сценарии и неизменность opening events                                                                |
| Новый визуальный browser spec и эталоны                                       | Парные Figma/implementation сравнения по полной матрице                                                                                              |
| docs/guides/post-engagement.md и execution records                            | Обновить конечное поведение; исторический функциональный успех не выдавать за design acceptance                                                      |

Сохраняются generated API operations, account-scoped keys, transport, session
generations, CSRF и backend access policy. Не предполагаются миграции или новые
endpoints. Общий chart widget не переделывается ради гипотетической универсальности;
если нужен новый внешний вид только для insights, изменения изолируются от
существующих dashboard consumers.

## Этапы реализации, проверки и наблюдаемый результат

Риски и границы: изменения API/DTO и миграции не предполагаются; новые endpoints
не нужны. Основные зависимости — существующие 169/171 queries и PWDRZ-166,
который уже присутствует в базе. Изменение shared chart несёт риск для dashboard:
поэтому его потребители входят в регрессии, а default presentation не меняется
ради owner-карточки. Удаление Refresh и открытие аналитики по кнопке согласованы.
Новый trigger учитывать как согласованное дополнение, а не существующий Figma frame.

### 1. Зафиксировать визуальный контракт

- Снять geometry/styles и reference screenshots всех строк матрицы.
- Составить список каждого текущего расхождения с привязкой к frame и исправлению.
- Зафиксировать согласованное дополнение: Analytics справа в строке действий,
  скрытая по умолчанию карточка на текущем месте; удалить лишние controls.
- Зафиксировать enabled/disabled и hover/focus/touch объяснение внешней кнопки
  как согласованное дополнение. Дизайн остальных компонентов не переизобретать.
- Проверить, покрыты ли обязательные варианты references и handoff; отсутствующие
  ссылки/состояния сразу вынести пользователю как препятствие приёмке.

**Результат:** manifest эталонов и проверяемый перечень отличий. Никакой вариант
ещё не получает Passed только потому, что найден frame.

### 2. Сначала unit-тесты, затем код

Написать и наблюдать падающие unit-тесты до исправлений:
авторский toggle существует, compact не показывает полный график, expanded
показывает его, Table раскрывается отдельно, смена периода сохраняет корректные
данные, фокус не теряется. Заменить старое утверждение, что у автора нет Details.
Добавить тесты внешней кнопки и отсутствия analytics requests до открытия,
повторного закрытия и сброса на другой пост/аккаунт. Сначала наблюдать их падение.
Добавить disabled-сценарии: кнопка видна и серая, aria-disabled=true, объяснение
доступно, click/Enter/Space не открывают карточку и не вызывают analytics API.
Зафиксировать red evidence; не имитировать его задним числом.

**Результат:** тесты воспроизводят выявленный дефект на старом коде, затем
проверяют требуемое поведение.

### 3. Восстановить общую карточку public/author

- Добавить согласованную кнопку Analytics в PostArticle и управление видимостью
  в PostPage; комментарии и их высоту не переделывать. Проверить отдельно внешний
  toggle и внутренние compact/expanded, чтобы один не подменял другой.

- Отступы, размеры, typography, badge и lock/icon — по manifest.
- Public: Score/Comments в compact; Openings и пояснение в expanded.
- Author: Openings → Score с UP/DOWN → Comments, диапазон дат и UTC в шапке.
- Desktop: Expand/Collapse; mobile: Details с правильным chevron и доступным именем.
- При раскрытии не перемонтировать статью/обсуждение, не терять черновик.
- Не добавлять отсутствующие в макете видимые подписи/контролы.

**Проверки:** unit component tests + предварительные парные browser renders.
**Результат:** оболочка и показатели соответствуют выбранным public/author frames.

### 4. Реализовать авторский compact

- Показать мини-график, подпись окна и периодный total как в compact frame.
- Использовать тот же разрешённый owner trend и его account/period key.
- Не скрывать обязательные данные ради оптимизации и не изображать мини-график
  случайными/decorative значениями.
- Отдельно проверить нулевые значения и не измеренные дни; не приравнивать null к 0.

**Проверки:** unit tests данных/геометрии, 7/30-day response mapping, visual compact.
**Результат:** авторская короткая карточка существует и совпадает с макетом,
а полный график в ней отсутствует.

### 5. Восстановить expanded, таблицу и privacy context

- Полный график, 7/30 days, оси, ticks, bars, partial today, легенда — по frames.
- Не оставлять dashboard metric selectors и другие отсутствующие элементы.
- Data table раскрывается отдельно; график остаётся видимым.
- Таблица использует те же значения, даты UTC и measured/null/partial состояния.
- Private author context расположен и оформлен по макету.
- Typography графика проверяется явно: текущие shared-axis значения 10px не
  соответствуют требованию handoff о минимуме 12px. Исправление не должно
  неожиданно менять другие страницы.

**Проверки:** unit tests, table/graph equality, keyboard/focus tests, visual 7/30/table.
**Результат:** expanded совпадает с соответствующими frames и не смешивает
периодный итог с накопленным числом открытий.

### 6. Loading/zero/error/retry/focus и mobile

- Воспроизвести существующие Figma-состояния, а не просто обернуть их общим
  QueryState/PanelError с отличающимся внешним видом.
- Сопоставить отказы summary/trend с карточкой ошибки из handoff; не придумывать
  частично успешную композицию с числами, если reference запрещает её.
- Сохранить безопасные сообщения без внутренних данных; не подменять ошибку нулями.
- Сохранить trigger focus при expand/collapse, period switch и table toggle.
- Retry остаётся доступным при неудаче; после успеха фокус возвращается к
  предусмотренному trigger без перехвата у ушедшего из карточки пользователя.
- Проверить 44×44 controls, 3px focus ring и минимум 12px supporting text по handoff.

**Проверки:** соответствующие visual frames, клавиатура, accessibility tree,
реальный screen reader при доступности; непройденные проверки явно отметить.
**Результат:** совпадают не только happy-path карточки, но и все требуемые состояния.

### 7. Обязательный gate соответствия дизайну 1:1

Для каждой строки матрицы:

- Reference и implementation в одинаковой ширине контейнера, с загруженными
  шрифтами и воспроизводимыми данными; сохранить оба изображения.
- Непосредственно сравнить композицию, числовую geometry, typography, цвета,
  иконки и controls; использовать overlay/diff и визуальный просмотр.
- Визуальные fixtures не являются доказательством реального backend.
- Baselines текущего UI не утверждать до проверки относительно Figma.
- Не маскировать карточку, обязательный control или расхождение, не вводить
  высокий допуск, позволяющий пройти отличающейся композиции.
- На других ширинах (в том числе 320/390/768px) проверить адаптивность отдельно.
  Не называть их pixel-perfect сравнением с отсутствующим frame этого размера.
- Проверить темы по существующим design references/tokens; отсутствие нужного
  эталона обозначать явно, а не дорисовывать его от себя.

**Результат:** у каждой строки есть reference, implementation и результат.
Любой непроверенный/несовпавший обязательный вариант оставляет задачу незавершённой.

### 8. Реальный API и регрессии

- Guest/member/author/staff видят только разрешённые поля; смена аккаунта и поздний
  ответ не возвращают чужой private trend.
- Compact/expanded/Table/period interactions используют реальные summary/series
  contracts; сохранены доступ к собственному draft и ограничения чужого.
- Голосование, comment/reply/delete и безопасное обновление дают серверные значения.
- После успешной записи навигационного opening зафиксировать baseline.
  Expand/collapse, смена периода, table toggle и refetch добавляют ноль view_count
  и POST_VIEWED. Намеренные navigation/reload openings PWDRZ-166 проверять отдельно.
- Запустить frontend typecheck/lint/format/coverage/build, API drift checks,
  E2E typecheck/format/infra и полный managed stack.
- Если затронут shared chart, проверить его существующих dashboard consumers.
  Ни thresholds, ни source coverage, ни retries не ослаблять.

**Результат:** functional/security acceptance сохранена, визуальная проверка её
дополняет, а не заменяет. Старые числа тестов не переносить в новый отчёт.

### 9. Handoff и честное завершение

- Сохранить матрицу приёмки со ссылками на пары изображений и реальные run/source IDs.
- Обновить инструкции 169/171: больше не утверждать, что авторского раскрытия нет
  из-за отсутствующей 171, и не трактовать старые screenshots как design acceptance.
- Отдельно перечислить всё, что не проверено, не соответствует или не имеет дизайна.
- Выполнить targeted provisional review затронутых модулей; не начинать
  стороннюю уборку и не изменять Jira/Figma без разрешения.

**Результат:** к сдаче допускается проверенный 1:1 UI; иначе статус —
незавершено с конкретной причиной. Код исправления начинается только после
согласования этого плана; текущие изменения ограничены AGENTS.md и этим документом.

## Порядок выполнения и команды проверки

Работа ведётся в `PWDRZ-169-fix-insights-design`; повторно создавать ветку не нужно.
Перед реализацией проверить HEAD/worktree/index и прочитать localTracking 169.
При старте реализации обновлять только её localTracking, не Jira payload.
Не изменять чужие staged changes. Commit/push/PR не входят в этот этап планирования.

Порядок: visual manifest и preview согласованного нового trigger → RED unit tests
→ внешний toggle/disabled → public/author shell → compact → expanded/table →
все load/error/retry состояния → real-stack regressions → полная визуальная
матрица → документация и evidence. Предварительные сравнения делать после
каждого UI-этапа, чтобы не откладывать обнаружение расхождений до самого конца.
Unit-тесты каждого следующего поведения писать и наблюдать падающими до его кода.

Из корня репозитория, после реализации:

```powershell
npm run typecheck --workspace frontend
npm run lint --workspace frontend
npm run format:check --workspace frontend
npm run test --workspace frontend
npm run test:coverage --workspace frontend
npm run build --workspace frontend
npm run api:check
npm run typecheck --workspace e2e
npm run format:check --workspace e2e
npm run test:infra --workspace e2e
npm run test:e2e
git diff --check
```

Focused Vitest runs до/во время кода выполняются из frontend для insights,
PostPage, PostOpening, session integration и затронутого ActionButton/chart;
добавленные pure mappings проверяются отдельными unit tests. Полный frontend
test run и coverage не заменять только этими focused runs. E2E запускается
управляемым launcher с настоящим isolated stack, одним worker и без retries.
Существующие backend/gateway checks, необходимые полному CI/PR, также должны
пройти; локально не выдавать не запущенный job за Passed. Backend/gateway source
по этому плану не меняются, их проверка не означает расширения scope.

Финальная визуальная матрица: все 26 ссылок Figma выше + новые согласованные
page-level состояния enabled/disabled, tooltip hover/focus/touch, closed/open,
desktop/mobile. Не заменять Figma эталоном из текущей реализации. Любое
отсутствующее обязательное design reference, непройденный visual scenario,
неустранённое отличие или непроверенная обязательная функциональная проверка
оставляют задачу незавершённой с явным объяснением пользователю.

## Критерии завершения фикса

- Analytics справа в actions у отрисованного поста; недоступная кнопка остаётся
  видимой, серой и неактивной, с доступной подсказкой, без analytics requests.
- По умолчанию карточки/её запросов нет; внешний toggle показывает/скрывает её
  на прежнем месте. Внутренние compact/expanded/table/period независимы.
- Public/author карточки, мини-график, график, таблица, privacy, состояния и
  labels соответствуют Figma; реальные данные не подменены fixtures.
- Refresh и другие неподтверждённые элементы удалены; Retry и безопасные ошибки
  сохранены. Focus/cancellation/session races проверены, приватные данные не текут.
- Комментарии, формы, якоря, post mutations и opening delivery не регрессировали.
- Проверки пройдены с новым evidence, документация и localTracking согласованы
  с фактическим результатом. Ни Jira, ни Figma не изменяются без разрешения.

Существенных неразрешённых решений после последнего уточнения пользователя
не осталось. Preview нового trigger и его подсказки — проверка согласованного
дополнения; их нельзя назвать буквальным существующим Figma frame. Если preview
потребует существенно другой композиции или обнаружится конфликт требований,
вынести это до реализации отклонения. Следующий этап — утверждение итогового
плана пользователем, затем реализация.
