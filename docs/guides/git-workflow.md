# Git workflow

This guide states the agreed team workflow for **new** work. Some existing
branches and repository settings still reflect earlier conventions. GitHub
rulesets determine what is technically enforced; their current settings have
not been independently verified in this documentation task. Do not claim a
policy is enforced until its configuration and a representative PR are checked.

## Branches and promotion

| Branch | Agreed role |
| --- | --- |
| `develop` | Integration branch and normal PR target. A dependent stacked PR may temporarily target its dependency branch. |
| `staging` | Formal release-candidate branch in the target workflow. CI, promotion and ownership still need implementation/verification; its mere existence does not imply a staging deployment. |
| `main` | Protected stable branch. It is not evidence of a live production deployment. Urgent hotfixes target it directly and are merged back to `develop` and, when relevant, `staging`. |

Normal task branches use `PWDRZ-<ticket>-<kebab-case-summary>`, for example
`PWDRZ-65-forum-posts-crud`. Keep the description short and recognizable.
One primary Jira ticket owns the branch; related subtasks or fixes may be
included when the PR explains the relationship. Do not rename old branches
solely to conform to the new pattern. Branch names are in English. A separate
ASCII-only rule adds nothing to this pattern.

The intended release flow is integration in `develop`, validation on
`staging`, and promotion to stable `main`. Until
[PWDRZ-138](https://project-wdrz.atlassian.net/browse/PWDRZ-138) establishes
the CI/promotion procedure, treat this as a target process rather than an
operational deployment guarantee. A hotfix merged directly to `main` must be reconciled
back to both active lines so the fix is not lost in the next promotion.

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

Merge only when every **applicable** check is green (see
[testing.md](testing.md) for current thresholds). A job legitimately skipped
because of a path filter is not a failure. This is both a team requirement
and a target GitHub branch-protection requirement; enforcement still needs
verification under [PWDRZ-137](https://project-wdrz.atlassian.net/browse/PWDRZ-137).
A red applicable check is not waived by a PR comment.

- `Build Backend`, `Build Frontend`, `Build Gateway`: only run when that
  workspace changed
- `Backend Tests`, `Frontend Tests`, `Gateway Tests`
- `Frontend Lint & Format Check`, `Gateway Lint & Format Check`

The E2E gate is not yet present; [PWDRZ-117](https://project-wdrz.atlassian.net/browse/PWDRZ-117)
owns adding it. Do not represent an absent gate as passing. If an applicable
check fails, fix the cause rather than disabling it.

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
