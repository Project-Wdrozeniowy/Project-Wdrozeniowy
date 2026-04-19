# 🌿 Working with Branches Guide

This document describes the branching strategy, naming conventions, and workflow used in this repository.

---

# 📌 Branch Strategy

We follow a simplified Git-based workflow with the following main branches:

- `main` → production-ready code
- `development` → integration branch for ongoing development
- `staging` → pre-production/testing environment (optional)

And your ticket branches:

- `feature/*` → new features
- `bugfix/*` → bug fixes
- `hotfix/*` → urgent fixes for production

---

# 🌱 Branch Naming Convention

All branches must follow this pattern:

```

type/TICKET-ID-short-description

```

### Examples:
- `feature/PWDRZ-30-login-page`
- `bugfix/PWDRZ-45-fix-auth-error`
- `hotfix/PWDRZ-99-critical-crash`

---

# 🧾 Pull Request Naming Convention

All Pull Requests must follow this format:

```

[PWDRZ-<number>]: Short description

````

### Examples:
- `[PWDRZ-30]: Add login page`
- `[PWDRZ-45]: Fix authentication error`
- `[PWDRZ-99]: Resolve crash on startup`

---

# 🔄 Workflow

## 1. Create a branch

Create a new branch from `development`:

```bash
git checkout development
git pull origin development
git checkout -b feature/PWDRZ-123-good-feature
````

---

## 2. Make changes

* Commit frequently with clear messages
* Keep commits small and meaningful

Example:

```bash
git commit -m "[PWDRZ-123]: Add login form validation"
```

---

## 3. Push your branch

```bash
git push origin feature/PWDRZ-123-good-feature
```

---

## 4. Create a Pull Request

* Base branch: `development`
* Compare branch: your feature branch
* PR title must follow the naming convention:

  ```
  [PWDRZ-123]: Good feature implementation
  ```

---

## 5. Code Review

* At least 1 approval required for PR
* Resolve all comments before merging
* Ensure CI checks pass

---

## 6. Merge

* Use **Squash merge** (recommended)
* Ensure branch is up to date before merging
* Delete branch after merge

---

# 🚀 Promotion Flow

```
feature/* → development → staging → main
```

---

# ✅ Rules

* ❌ No direct commits to `main`
* ❌ No force pushes to protected branches
* ❌ No merging without PR
* ✔ All PRs must pass CI checks
* ✔ All conversations must be resolved
* ✔ PR title must follow convention

---

# 🧪 CI / Checks

Before merging, the following must pass:

* Build
* Lint
* Tests

---

# 👥 Code Review Guidelines

* Review code for:

  * correctness
  * readability
  * performance
  * security
* Provide constructive feedback
* Approve only when ready to merge

---

# 🧹 Best Practices

* Keep branches small and focused
* Avoid long-lived branches
* Rebase frequently to avoid conflicts
* Write clear commit messages
* Follow naming conventions strictly

---

# 📦 Notes

* Use `development` as the default base branch for new work
* Use `main` only for production releases
* Use `staging` for final testing before production (if applicable)