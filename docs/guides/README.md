# Developer guides

> [Русская версия / Russian translation ↓](#ru) — temporary reading aid; the
> English text is canonical.

This is the entry point for **human-facing** engineering guidance. Read it
before your first PR.

- The [root README](../../README.md) covers setup and running Orbita.
- [docs/README.md](../README.md) maps every documentation category.

These guides record team decisions and target conventions. *They do not claim
that all existing code already follows them.*

## What to read

| Situation | Read |
| --- | --- |
| Every contributor, before a first PR | This page, [architecture and extension guide](architecture.md), [Git workflow](git-workflow.md), and [testing](testing.md) |
| Adding a backend domain, frontend feature, gateway middleware, or API operation | [Architecture and extension guide](architecture.md), then [frontend target architecture](frontend/README.md) for frontend work and [naming conventions](naming-conventions.md) |
| Naming a file, type, function, table, or export | [Naming conventions](naming-conventions.md) |
| Creating a branch, commit, or PR; resolving review feedback | [Git workflow](git-workflow.md), [PR guide](pr-guidelines.md), and the short [PR template](../../.github/pull_request_template.md) |
| Adding tests or assessing completion | [Testing guide](testing.md) and the Definition of Done below |
| Running or debugging one service | The [frontend](../../frontend/README.md) or [gateway](../../gateway/README.md) README, plus the [root setup](../../README.md) |

The [codebase maps](../codebase/) are dated technical snapshots for agents and
investigation, **not the primary source of developer rules**. The [agent entry
point](../../AGENTS.md) and [Copilot instructions](../../.github/copilot-instructions.md)
serve tooling; they should point to these guides instead of defining competing
policies.

**Source code and configuration establish current behaviour; these guides
establish approved practice.** Track a gap as work rather than silently
rewriting the convention.

## Definition of Done

The relevant implementation owner supplies evidence for their service. The
integration owner verifies affected boundaries; one person's local tests do
not prove a multi-service path.

- **Local frontend or gateway change:** the intended behaviour is verified at
  a useful boundary; affected typecheck, lint, formatting, tests, coverage
  gate, and production build pass. New UI behaviour requires browser-level
  E2E evidence. PWDRZ-117 must establish its automated CI gate; until then,
  record reproducible browser verification and do not claim that the missing
  gate passed. Current React Testing Library tests remain useful but do not
  substitute for browser verification.
- **Local backend change:** relevant Java tests and `./mvnw verify` pass;
  controller, service, security, or persistence behaviour is checked at the
  boundary changed. A schema or enum mapping change has a Flyway-backed
  round-trip test.
- **Cross-service change:** every affected service passes its own checks, the
  frontend and backend agree on the implemented HTTP contract, and there is
  reproducible integration evidence across the changed boundary. When the
  user-visible path changes, include browser-level proof as well.
- **Docs or configuration change:** update affected links and instructions,
  verify commands against configuration, and do not commit secrets or generated
  reports as hand-written documentation.

> **Current quality gap:** Existing coverage gates remain mandatory, but are
> **not proof of sufficient behavioural coverage**.
> [PWDRZ-118](https://project-wdrz.atlassian.net/browse/PWDRZ-118) has selected
> and verified service-specific coverage gates locally and in GitHub CI; see
> the [coverage policy](testing.md#coverage-policy-pwdrz-118) and
> [final evidence](../agent-task-backlog/pwdrz-118-final-decisions.md#final-ci-verification-and-acceptance-sign-off).
> [PWDRZ-117](https://project-wdrz.atlassian.net/browse/PWDRZ-117) owns the
> mandatory E2E/CI gate; it does not exist yet. Do not describe an unrun
> browser scenario or a non-existent workflow as passed. Unit coverage does
> not close this gap.

When a task previously treated as implemented reveals additional work, track
the residual in a separate owner-specific Jira task rather than rewriting its
implementation history.

## Language and maintenance

**Required language:** Code identifiers, test names, branch names, commit
subjects, and PR metadata use English. Developer guides may use English or
Polish. Russian is also permitted during initial development so contributors
can understand the decisions accurately.

> **Temporary localization / TODO:** Keep each Russian section aligned with
> its canonical English guide. At final hand-off or when the project no longer
> needs this reading aid, remove the Russian sections under
> [PWDRZ-139](https://project-wdrz.atlassian.net/browse/PWDRZ-139). Do not
> translate code identifiers or API names.

Update the relevant guide when a team decision changes. Keep factual snapshots
descriptive and regenerate them only from verified evidence.

<a id="ru"></a>

## Русская версия — временная вспомогательная локализация

> Этот перевод помогает команде на раннем этапе разработки. **Каноническая
> версия — английский текст выше.** При изменении правил обновляйте обе
> версии. Удаление временных русских разделов после завершения проекта или
> перехода в более зрелую стадию: [PWDRZ-139](https://project-wdrz.atlassian.net/browse/PWDRZ-139).

Это основная точка входа в **документацию для разработчиков**. Прочитайте её
перед первым PR.

- [Корневой README](../../README.md) описывает установку и запуск Orbita.
- [docs/README.md](../README.md) перечисляет категории документации.

Гайды фиксируют решения команды и целевые правила. *Они не утверждают, что
весь существующий код уже им соответствует.*

### Что читать

| Ситуация | Документы |
| --- | --- |
| Перед первым PR | Эта страница, [архитектура и расширение проекта](architecture.md), [Git workflow](git-workflow.md), [тестирование](testing.md) |
| Новый backend-домен, frontend-функция, gateway middleware или API-операция | [Архитектура](architecture.md), для frontend — [целевая архитектура](frontend/README.md), затем [правила именования](naming-conventions.md) |
| Имя файла, типа, функции, таблицы или экспорта | [Правила именования](naming-conventions.md) |
| Ветка, коммит, PR или ответ на review | [Git workflow](git-workflow.md), [PR guide](pr-guidelines.md), краткий [PR template](../../.github/pull_request_template.md) |
| Тесты или оценка готовности | [Тестирование](testing.md) и Definition of Done ниже |
| Запуск или отладка сервиса | [Frontend](../../frontend/README.md) либо [gateway](../../gateway/README.md) README и [корневые инструкции](../../README.md) |

[Карты кодовой базы](../codebase/) — датированные технические снимки для
агентов и исследования, **не основной источник правил для разработчиков**.
[AGENTS.md](../../AGENTS.md) и [инструкции Copilot](../../.github/copilot-instructions.md)
предназначены для tooling: они должны ссылаться на гайды, а не вводить
конкурирующие правила.

**Код и конфигурация определяют текущее поведение; гайды — утверждённую
практику.** Расхождения оформляются как задачи, а не устраняются молчаливым
изменением правил.

### Definition of Done

Исполнитель подтверждает результат в своём сервисе. Владелец интеграции
проверяет затронутые границы: локальные тесты одного человека не доказывают
работу пути через несколько сервисов.

- **Локальное изменение frontend или gateway:** поведение проверено на
  подходящей границе; применимые typecheck, lint, formatting, tests, coverage
  gate и production build проходят. Для нового поведения UI нужно
  подтверждение в браузере. PWDRZ-117 должна добавить автоматический E2E
  gate в CI; до этого фиксируйте воспроизводимую браузерную проверку и не
  заявляйте, что отсутствующий gate пройден. React Testing Library полезен,
  но не заменяет браузерную проверку.
- **Локальное изменение backend:** релевантные Java-тесты и `./mvnw verify`
  проходят; поведение controller, service, security или persistence проверено
  на изменённой границе. Для изменения схемы или enum mapping нужен
  round-trip тест с настоящими Flyway-миграциями.
- **Изменение между сервисами:** проходят проверки каждого затронутого
  сервиса; frontend и backend согласованы по реализованному HTTP-контракту;
  есть воспроизводимое подтверждение интеграции. Если изменился видимый
  пользователю путь, добавьте проверку в браузере.
- **Документация или конфигурация:** обновите ссылки и инструкции, сверьте
  команды с конфигурацией; не коммитьте секреты и сгенерированные отчёты как
  рукописную документацию.

> **Текущий пробел качества:** Coverage gates обязательны, но **процент не
> доказывает достаточного поведенческого покрытия**.
> В [PWDRZ-118](https://project-wdrz.atlassian.net/browse/PWDRZ-118) выбраны и
> проверены gates всех трёх сервисов локально и в GitHub CI; см.
> [coverage policy](testing.md#coverage-policy-pwdrz-118) и
> [финальные результаты](../agent-task-backlog/pwdrz-118-final-decisions.md#final-ci-verification-and-acceptance-sign-off).
> [PWDRZ-117](https://project-wdrz.atlassian.net/browse/PWDRZ-117) отвечает
> за обязательный E2E/CI gate; пока его нет, нельзя заявлять, что браузерный
> сценарий или несуществующий workflow пройден. Unit coverage не закрывает
> этот пробел.

Если в задаче, которую считали реализованной, обнаружилась дополнительная
работа, оформите её отдельной Jira-задачей для соответствующего исполнителя,
не переписывая историю первоначальной реализации.

### Язык и поддержка

**Обязательный язык:** Идентификаторы, имена тестов и веток, темы коммитов и
метаданные PR пишутся на английском. Developer guides могут быть на английском
или польском; на раннем этапе допускается русский.

> **Временная локализация / TODO:** Русские разделы должны соответствовать
> английским canonical-разделам. Удалите их при финальной передаче проекта
> или когда команда больше в них не нуждается —
> [PWDRZ-139](https://project-wdrz.atlassian.net/browse/PWDRZ-139). Не
> переводите идентификаторы кода и имена API.

При изменении решения команды обновите соответствующий гайд; фактические
снимки обновляйте только по проверенным данным.
