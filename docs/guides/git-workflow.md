# Git workflow

## Branches

| Branch         | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| `main`         | Production. Only fast-forwards from `develop` after a release tag. |
| `develop`      | Integration branch. All feature work merges here. |
| `feature/*`    | Day-to-day work. One ticket per branch. |
| `bugfix/*`     | Bug fixes that do not match a Jira feature. |
| `hotfix/*`     | Emergency fixes against `main`. |
| `docs/*`       | Documentation-only changes. |

### Naming pattern

```
feature/PWDRZ-<ticket>-<kebab-case-summary>
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

- Target branch is **`develop`** for everything that is not a hotfix.
- Title matches the commit subject: `[PWDRZ-XX]: <summary>`.
- Body sections:
  - **Summary** — 2–5 bullets describing the change.
  - **Test plan** — checklist of how the reviewer can verify it (build, tests,
    manual smoke).
  - Optional **Notes** — follow-ups, known limitations.
- Link the Jira ticket at the bottom: `Closes PWDRZ-XX`.

### Stacked PRs

If a PR depends on another open PR (e.g. PWDRZ-69 builds on PWDRZ-65), set the
**base branch** to the dependency's branch. Once the dependency merges,
retarget the base to `develop`.

### Review

- At least one human approval is required on every PR (branch protection).
- Re-request review after pushing changes.
- Squash on merge unless there is a reason to preserve history.

## CI requirements

A PR can only merge when **all** of these are green (see
[testing.md](./testing.md) for thresholds):

- `Build Backend`
- `Backend Tests`
- `Frontend Lint & Format Check`
- `Frontend Tests`
- `Gateway Lint & Format Check`
- `Gateway Tests`

If a check fails, fix the cause; do **not** disable the check.

## Local hygiene

- Rebase your feature branch on `develop` before opening the PR if it has
  drifted more than a few commits.
- Never `git push --force` to `main` or `develop`.
- `--force-with-lease` is fine on your own feature branch.
- Never commit `.env`, secrets, build output (`dist/`, `target/`, `.next/`),
  IDE files (`.idea/`, `.vscode/` unless shared).
