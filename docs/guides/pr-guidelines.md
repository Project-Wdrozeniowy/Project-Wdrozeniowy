# Pull request guide

> [Русская версия / Russian translation ↓](#ru) — temporary reading aid; the
> English text is canonical.

Use the short [PR template](../../.github/pull_request_template.md) as the
GitHub form. This guide explains how to fill it in for someone who did not
implement the change. For branches, commits, review, and merge rules, see
[Git workflow](git-workflow.md).

## Required information

Every task PR includes:

- **Required — Jira:** the primary ticket key or link.
- **Required — How to Test:** commands or manual steps, relevant setup,
  expected result, and any check you could not run. A passing CI badge alone
  does not explain which task-specific behaviour was validated.

The template also offers:

- **Recommended — Summary:** what changed and why. A larger PR may include a
  concise `Changes` list. Explain motivation when the ticket does not.
- **Optional — Notes / Risks:** migrations, compatibility, security,
  deployment effects, known limitations, or a screenshot of a visible change.

*An honest “not applicable” is more useful than empty boilerplate.*

## Example

```markdown
## Summary
Connect the forum feed to the existing paginated posts API so users see
persisted posts instead of local fixtures.

## How to Test
- Start PostgreSQL, backend, gateway, and frontend using the root README.
- Sign in, open `/forum`, and confirm the first page comes from the API.
- Run `npm --prefix frontend run test:coverage` and
  `npm --prefix frontend run typecheck`.
- Not checked: production deployment; this PR does not deploy.

## Jira Ticket
PWDRZ-81

## Notes / Risks
The feed's empty state changes when the API returns zero posts.
```

> **Example only:** These steps do not claim that PWDRZ-81 is implemented.
> Use actual commands and outcomes in your own PR.

## Common mistakes

- `fix stuff`, a file list, or only a Jira key: reviewers cannot see the
  outcome or motivation.
- “Tested” without steps or results: another developer cannot reproduce it.
- Claiming a browser or cross-service flow works based only on a service unit
  test or a coverage percentage.
- Hiding an unrun check, migration impact, or an unresolved risk.
- Mixing unrelated tickets in one PR without naming the primary result and
  linked follow-up work.

**Keep one coherent outcome per PR.** If the diff is unusually large, explain
why it cannot be safely separated and suggest a review order. Before
requesting review, use the
[Definition of Done](README.md#definition-of-done) for affected boundaries.

<a id="ru"></a>

## Русская версия — временная вспомогательная локализация

> Это вспомогательный перевод для раннего этапа. **Канонический источник —
> английский текст выше.** Поддерживайте их согласованность. Удаление
> русского раздела в конце проекта или при взрослении процесса:
> [PWDRZ-139](https://project-wdrz.atlassian.net/browse/PWDRZ-139).

Краткий [PR template](../../.github/pull_request_template.md) — форма для
GitHub. Этот гайд объясняет, как заполнить её для человека, который не писал
изменение. Правила веток, коммитов, review и merge — в
[Git workflow](git-workflow.md).

### Обязательная информация

Каждый PR по задаче содержит:

- **Обязательно — Jira:** ключ или ссылку на основную задачу.
- **Обязательно — How to Test:** команды или ручные шаги, необходимую
  подготовку, ожидаемый результат и непроведённые проверки. Одна зелёная
  отметка CI не показывает, какое поведение задачи было подтверждено.

Шаблон также предлагает:

- **Рекомендуется — Summary:** что изменилось и почему. Для большого PR
  можно добавить краткий список `Changes`. Если мотивация неочевидна из
  задачи, объясните её.
- **Необязательно — Notes / Risks:** миграции, совместимость, безопасность,
  влияние на deployment, известные ограничения или скриншот видимого
  изменения.

*Честное «не применяется» полезнее пустого шаблонного текста.*

### Пример

```markdown
## Summary
Connect the forum feed to the existing paginated posts API so users see
persisted posts instead of local fixtures.

## How to Test
- Start PostgreSQL, backend, gateway, and frontend using the root README.
- Sign in, open `/forum`, and confirm the first page comes from the API.
- Run `npm --prefix frontend run test:coverage` and
  `npm --prefix frontend run typecheck`.
- Not checked: production deployment; this PR does not deploy.

## Jira Ticket
PWDRZ-81

## Notes / Risks
The feed's empty state changes when the API returns zero posts.
```

> **Только пример:** Эти шаги **не утверждают**, что PWDRZ-81 реализована.
> В своём PR указывайте фактические команды и результаты. Пример оставлен
> на английском: метаданные PR по соглашению команды пишутся на английском.

### Частые ошибки

- `fix stuff`, список файлов или только ключ Jira не объясняют результат и
  причину изменения.
- «Tested» без шагов и результата невозможно воспроизвести.
- Unit-тест сервиса или процент покрытия не подтверждают браузерный либо
  межсервисный путь.
- Не скрывайте непроведённую проверку, влияние миграции или открытый риск.
- Не смешивайте несвязанные задачи в PR без указания основного результата и
  связанных последующих работ.

**Один PR должен давать один связный результат.** Если diff необычно велик,
объясните, почему его нельзя безопасно разделить, и предложите порядок
review. Перед запросом review проверьте
[Definition of Done](README.md#definition-of-done) для затронутых границ.
