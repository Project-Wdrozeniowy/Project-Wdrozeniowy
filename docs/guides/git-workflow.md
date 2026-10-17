# Git workflow

> [Русская версия / Russian translation ↓](#ru) — temporary reading aid; the
> English text is canonical.

This guide states the agreed team workflow for **new** work. Some existing
branches and repository settings still reflect earlier conventions.

> **Enforcement status:** GitHub rulesets determine what is technically
> enforced. Their current settings have not been independently verified in
> this documentation task. **Do not claim a policy is enforced** until its
> configuration and a representative PR are checked.

## Branches and promotion

| Branch | Agreed role |
| --- | --- |
| `develop` | Integration branch and normal PR target. A dependent stacked PR may temporarily target its dependency branch. |
| `staging` | Formal release-candidate branch in the target workflow. CI, promotion and ownership still need implementation/verification; its mere existence does not imply a staging deployment. |
| `main` | Protected stable branch. It is not evidence of a live production deployment. Urgent hotfixes target it directly and are merged back to `develop` and, when relevant, `staging`. |

**Normal task branch:** `PWDRZ-<ticket>-<kebab-case-summary>`, for example
`PWDRZ-65-forum-posts-crud`. Keep the description short and recognizable.

- One primary Jira ticket owns the branch. Include related subtasks or fixes
  when the PR explains their relationship.
- **Do not rename old branches** solely to match this pattern.
- Branch names use English. *A separate ASCII-only rule adds nothing to this
  pattern.*

**Target release flow:** integrate in `develop` → validate on `staging` →
promote to stable `main`.

Until [PWDRZ-138](https://project-wdrz.atlassian.net/browse/PWDRZ-138)
establishes CI and promotion, *this is a target process, not a deployment
guarantee*. **Reconcile a hotfix merged directly to `main` back to both active
lines** so it is not lost in the next promotion.

## Commits

- Keep each commit to one independently understandable logical change. A
  branch and PR may contain several such commits; the merge itself is squash.
- Task commit subject: `[PWDRZ-XX]: <clear action summary>`. Prefer an
  imperative verb, but meaning matters more than grammar. No numeric subject
  length or body line-wrap limit is imposed.
- A body is optional. Add one when the reason, trade-off, migration, or risk
  would not be clear from the subject and diff; explain the important `why`
  and, where useful, the significant `what`.
- Do not add `Co-Authored-By` trailers under the agreed commit convention.
- Commit subjects and bodies are in English.

Good:

```
[PWDRZ-62]: Rotate refresh tokens on /auth/refresh

Mark the presented token revoked and issue a brand new pair so a stolen
token is only valid until the next legitimate refresh.
```

Bad:

```
fixes
update stuff
WIP
```

## Pull requests

- Normally target **`develop`**. Release promotion and direct-to-`main`
  hotfixes are separate flows; stacked PRs are the exceptional dependency
  case below.
- PR title: `[PWDRZ-XX]: <clear action summary>`. With squash merge, check
  the resulting squash subject as well.
- The [PR template](../../.github/pull_request_template.md) requires only a
  Jira ticket key/link and how the change was verified. A concise summary,
  motivation, changes list, and risks are recommended when they add context;
  see the [PR guide](pr-guidelines.md). State checks not run and why.
- Keep one coherent result per PR. Explain a large diff and suggest a review
  order instead of imposing an arbitrary file or line limit.

### Stacked PRs

Stacked PRs are an **exceptional technique**, not the default for the team.
An experienced contributor may base a dependent PR on the prerequisite's
branch, identify that dependency in both PR descriptions, and keep each diff
independently reviewable. Once the prerequisite is squash-merged, retarget the
dependent PR to `develop`, update the personal branch carefully, and inspect
the resulting diff for duplicated commits before merging. Do not rewrite a
shared or protected branch to repair the stack.

### Review

- Review is recommended for large or cross-cutting changes, architecture
  changes, and refactoring someone else's code. A mandatory approval count
  is **not** part of the team policy.
- When review occurs, resolve every substantive thread before merge; do not
  silently dismiss a disagreement. The author and reviewer coordinate after
  subsequent pushes; an automatic re-review request after every push is not
  required.
- Use squash merge for PRs. Verify the available GitHub merge methods rather
  than assuming the ruleset already enforces this choice.

## CI requirements

**Merge only when every applicable check is green** (see
[testing.md](testing.md) for current thresholds). A job legitimately skipped
by a path filter is not a failure; a red applicable check is **not waived**
by a PR comment.

This is a team requirement and a target GitHub branch-protection requirement.
Technical enforcement still needs verification under
[PWDRZ-137](https://project-wdrz.atlassian.net/browse/PWDRZ-137).

- `Build Backend`, `Build Frontend`, `Build Gateway`: only run when that
  workspace changed
- `Backend Tests (coverage gates)`, `Frontend Tests (coverage gates)`, `Gateway Tests (coverage gates)`
- `Frontend Lint & Format Check`, `Gateway Lint & Format Check`

The separate `E2E (Chromium)` workflow/check belongs to
[PWDRZ-117](https://project-wdrz.atlassian.net/browse/PWDRZ-117). See its
[execution record](../agent-task-backlog/pwdrz-117-execution.md) for actual CI and
required-check verification. A skipped/unrun check is not a pass. If an
applicable check fails, fix the cause rather than disabling it. Selective CI
and wider branch enforcement remain PWDRZ-137.

## Daily branch commands

Start a task branch from the integration branch:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c PWDRZ-123-short-description
```

Push the branch and open a pull request targeting `develop`:

```bash
git push -u origin PWDRZ-123-short-description
```

Update a personal task branch when conflicts or significant drift make its
diff or checks unreliable. Rebase personal commits or merge `develop`,
whichever is safer for the branch and its collaborators:

```bash
git fetch origin
git rebase origin/develop
```

Before any force update, check remote state. Use `--force-with-lease` only on
your own task branch after a rebase; never on shared or protected branches.

## Local hygiene

- Do not rebase merely because an arbitrary commit count was reached.
- Never force-push to `main`, `develop`, or `staging`.
- Never commit `.env`, secrets, build output (`dist/`, `target/`, `.next/`),
  IDE files (`.idea/`, `.vscode/` unless shared).

<a id="ru"></a>

## Русская версия — временная вспомогательная локализация

> Это вспомогательный перевод для раннего этапа. **Канонический источник —
> английский текст выше.** При изменении правил обновляйте обе версии.
> Удаление русского раздела в конце проекта или при взрослении процесса:
> [PWDRZ-139](https://project-wdrz.atlassian.net/browse/PWDRZ-139).

Гайд задаёт согласованный процесс для **новой** работы. Часть старых веток
и настроек репозитория следует прежним правилам.

> **Статус enforcement:** Что технически enforced, определяют GitHub
> rulesets. Их настройки не удалось независимо проверить при этой
> документационной работе. **Не заявляйте, что правило enforced**, пока не
> проверены конфигурация и пример PR.

### Ветки и продвижение изменений

| Ветка | Согласованная роль |
| --- | --- |
| `develop` | Интеграционная ветка и обычная цель PR. Зависимый stacked PR временно может целиться в ветку своей зависимости. |
| `staging` | Целевая ветка release candidate. CI, продвижение и ответственность ещё нужно реализовать/проверить; наличие ветки не доказывает deployment на staging. |
| `main` | Защищённая стабильная ветка, но не доказательство существующего production deployment. Срочный hotfix идёт прямо в неё, затем переносится обратно в `develop` и, если применимо, `staging`. |

**Обычная ветка задачи:** `PWDRZ-<ticket>-<kebab-case-summary>`, например
`PWDRZ-65-forum-posts-crud`. Описание должно быть коротким и узнаваемым.

- Ветке соответствует одна основная Jira-задача. Связанные subtasks или
  fixes допустимы, если их связь объяснена в PR.
- **Не переименовывайте старые ветки** только ради нового формата.
- Имена веток — на английском. *Дополнительное правило «только ASCII» к
  этому формату ничего не добавляет.*

**Целевой release flow:** интеграция в `develop` → проверка на `staging` →
продвижение в стабильный `main`.

Пока [PWDRZ-138](https://project-wdrz.atlassian.net/browse/PWDRZ-138) не
установит CI и процедуру продвижения, *это цель процесса, а не гарантия
работающего deployment*. **Hotfix, напрямую слитый в `main`, нужно вернуть
в обе активные линии**, чтобы он не потерялся при следующем продвижении.

### Коммиты

- Один коммит — одно самостоятельно понятное логическое изменение. Ветка и
  PR могут содержать несколько таких коммитов; merge выполняется squash.
- Тема коммита задачи: `[PWDRZ-XX]: <clear action summary>`. Желателен
  глагол в повелительной форме, но смысл важнее грамматики. Числового
  ограничения длины темы и правила переноса строк body нет.
- Body необязателен. Добавляйте его, если причина, компромисс, миграция или
  риск неясны из темы и diff; объясните значимое `why` и при необходимости
  важное `what`.
- По принятой convention не добавляйте trailers `Co-Authored-By`.
- Темы и bodies коммитов пишутся на английском.

Хороший пример (текст коммита сохраняется на английском):

```text
[PWDRZ-62]: Rotate refresh tokens on /auth/refresh

Mark the presented token revoked and issue a brand new pair so a stolen
token is only valid until the next legitimate refresh.
```

Плохие темы:

```text
fixes
update stuff
WIP
```

### Pull requests

- Обычная цель — **`develop`**. Release promotion и hotfix прямо в `main` —
  отдельные процессы; stacked PR — исключение для зависимых изменений.
- Заголовок PR: `[PWDRZ-XX]: <clear action summary>`. При squash merge
  проверьте и итоговую тему squash-коммита.
- [PR template](../../.github/pull_request_template.md) требует только
  ключ/ссылку Jira и описание проверки. Краткие summary, motivation,
  changes и risks рекомендованы, когда полезны; см. [PR guide](pr-guidelines.md).
  Указывайте непроведённые проверки и причину.
- Один PR — один связный результат. Для большого diff объясните его и
  предложите порядок review вместо произвольного лимита файлов или строк.

#### Stacked PRs

Это **исключительная техника**, не обычный процесс команды. Опытный
разработчик может создать зависимый PR от prerequisite branch, указать
зависимость в обоих описаниях и держать каждый diff отдельно проверяемым.
После squash merge prerequisite PR перенаправьте зависимый PR в `develop`,
осторожно обновите личную ветку и проверьте diff на повторяющиеся коммиты.
Не переписывайте общую или защищённую ветку ради исправления stack.

#### Review

- Review рекомендуется для больших/сквозных и архитектурных изменений,
  а также рефакторинга чужого кода. Обязательного числа approvals в политике
  команды **нет**.
- Если review состоялось, разрешите все содержательные обсуждения до merge;
  не закрывайте несогласие молча. После новых push автор и reviewer
  координируются; автоматически запрашивать новое review после каждого
  push не требуется.
- Используйте squash merge. Проверяйте доступные методы GitHub merge, а не
  предполагайте, что ruleset уже заставляет выбрать squash.

### Требования CI

**Merge допустим, только когда все применимые проверки зелёные** (текущие
пороги — в [testing.md](testing.md)). Job, корректно пропущенный по path
filter, не считается провалом; комментарий в PR **не отменяет** красную
применимую проверку.

Это командное и целевое branch-protection требование. Техническое enforcement
проверяется в [PWDRZ-137](https://project-wdrz.atlassian.net/browse/PWDRZ-137).

- `Build Backend`, `Build Frontend`, `Build Gateway` запускаются только при
  изменении соответствующего workspace.
- `Backend Tests (coverage gates)`, `Frontend Tests (coverage gates)`, `Gateway Tests (coverage gates)`.
- `Frontend Lint & Format Check`, `Gateway Lint & Format Check`.

Отдельный workflow/check `E2E (Chromium)` относится к
[PWDRZ-117](https://project-wdrz.atlassian.net/browse/PWDRZ-117); фактические CI и
required-check результаты — в [execution record](../agent-task-backlog/pwdrz-117-execution.md).
Пропущенный/незапущенный check не считается пройденным. При падении применимой
проверки исправляйте причину, а не отключайте её. Выборочный CI и остальные
branch rules остаются PWDRZ-137.

### Ежедневные команды для веток

Создайте ветку задачи от интеграционной ветки:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c PWDRZ-123-short-description
```

Отправьте ветку и откройте PR в `develop`:

```bash
git push -u origin PWDRZ-123-short-description
```

Обновляйте личную ветку, когда конфликты или существенное отставание мешают
понимать diff и результаты проверок. Rebase личных коммитов либо merge
`develop` выбирайте по безопасности для ветки и её участников:

```bash
git fetch origin
git rebase origin/develop
```

Перед любым принудительным обновлением проверьте состояние remote.
`--force-with-lease` допустим только для собственной ветки после rebase;
никогда — для общих или защищённых веток.

### Локальная гигиена

- Не делайте rebase только из-за произвольного количества коммитов.
- Никогда не делайте force-push в `main`, `develop` или `staging`.
- Не коммитьте `.env`, секреты, build output (`dist/`, `target/`, `.next/`),
  IDE-файлы (`.idea/`, `.vscode/`, если они не общие).
