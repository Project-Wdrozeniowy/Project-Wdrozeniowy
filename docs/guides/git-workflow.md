# Git workflow

## Branches

| Branch         | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| `main`         | Production. Updated from `develop` for a release. |
| `develop`      | Integration branch. Every PR targets it. |
| `feature/*`    | Day-to-day work. One ticket per branch. |
| `bugfix/*`     | Bug fixes. |
| `hotfix/*`     | Urgent fixes that should skip the normal queue; they still target `develop`. |
| `docs/*`       | Documentation-only changes. |

### Naming pattern

```
<type>/PWDRZ-<ticket>-<kebab-case-summary>
```

Examples:

```
feature/PWDRZ-65-forum-posts-crud
feature/PWDRZ-62-refresh-token-rotation
docs/PWDRZ-42-conventions
```

Keep the summary short (≤ 6 words). Use ASCII only.

## Commits

- One logical change per commit.
- Subject line: `[PWDRZ-XX]: <imperative summary>`, max 72 characters.
- Body wraps at 72 characters and explains **why**, not what.
- **No co-author trailer.** The repository tracks who wrote each line via the
  commit author. Co-authors are added only when more than one person physically
  wrote the change.
- Commit messages are written in **English**.

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

- Target branch is **`develop`**.
- Title matches the commit subject: `[PWDRZ-XX]: <summary>`.
- Body follows the PR template (`.github/pull_request_template.md`):
  **Summary**, **How to Test**, **Jira Ticket**, optional **Notes / Risks**.
  [branch_namings.md](./branch_namings.md) explains how to fill it in.

### Stacked PRs

If a PR depends on another open PR (e.g. PWDRZ-69 builds on PWDRZ-65), set the
**base branch** to the dependency's branch. Once the dependency merges,
retarget the base to `develop`. Because the dependency was squash-merged, your
branch still contains its original commits: merge `develop` into your branch
(or rebase only your own commits onto it) before asking for another review.

### Review

- Ask for at least one review from a teammate before merging. The `develop`
  ruleset doesn't require an approval, so this is a team rule, not a check.
- All review threads must be resolved before merging (enforced).
- Re-request review after pushing changes.
- PRs into `develop` are **squash-merged** (the only merge method the ruleset
  allows), so the PR title becomes the commit subject on `develop`.

## CI requirements

Merge only when every check on the PR is green (see [testing.md](./testing.md)
for thresholds). The ruleset doesn't enforce this, so it's up to whoever merges.

- `Build Backend`, `Build Frontend`, `Build Gateway`: only run when that
  workspace changed
- `Backend Tests`, `Frontend Tests`, `Gateway Tests`
- `Frontend Lint & Format Check`, `Gateway Lint & Format Check`

If a check fails, fix the cause; do **not** disable the check.

## Daily branch commands

Start a task branch from the integration branch:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/PWDRZ-123-short-description
```

Push the branch and open a pull request targeting `develop`:

```bash
git push -u origin feature/PWDRZ-123-short-description
```

For an existing branch, update it from `develop` before requesting review:

```bash
git fetch origin
git rebase origin/develop
```

Use `--force-with-lease` only when updating your own branch after a rebase.

## Local hygiene

- Rebase your feature branch on `develop` before opening the PR if it has
  drifted more than a few commits.
- Never `git push --force` to `main` or `develop`.
- `--force-with-lease` is fine on your own feature branch.
- Never commit `.env`, secrets, build output (`dist/`, `target/`, `.next/`),
  IDE files (`.idea/`, `.vscode/` unless shared).
