# PR Description Guide

This guide defines how to write clear, concise, and useful Pull Request (PR) descriptions.

---

## 🎯 Goals

* Help reviewers understand changes quickly
* Provide enough context for effective code review
* Make PRs easy to test and validate
* Link work to Jira tickets

---

## 📌 General Principles

* Keep it **concise but informative**
* Focus on **what** and **why**, not just **how**
* Avoid unnecessary repetition of code changes
* Write for someone who is not familiar with the task

---

## 🧩 Recommended Structure

### 1. Summary

A short description of what this PR does.

* 1–3 sentences maximum
* Should be understandable without reading the code

**Example:**

> Adds user authentication via JWT and protects private routes.

---

### 2. Changes

A brief list of key changes introduced in the PR.

* Bullet points are preferred
* Focus on meaningful changes, not file-by-file details

**Example:**

* Implemented JWT-based authentication
* Added login and logout endpoints
* Protected API routes with middleware

---

### 3. Motivation (Optional)

Explain why this change is needed.

Include when:

* The solution is not obvious
* There are multiple approaches
* Business or technical context is important

**Example:**

> Required to secure API endpoints and prevent unauthorized access.

---

### 4. How to Test

Provide clear steps to verify the changes.

* Include setup if needed
* Include expected behavior
* Keep steps reproducible

**Example:**

* Run the application
* Navigate to `/login`
* Enter valid credentials
* Verify access to protected routes

---

### 5. Jira Ticket

Link the related Jira issue in description.

**Example:**

```
PWDRZ-1234
```

or

```
Closes PWDRZ-1234
```

---

### 6. Notes / Risks (Optional)

Highlight anything important for reviewers or QA.

* Edge cases
* Known limitations
* Potential regressions
* Performance considerations

**Example:**

* Authentication tokens expire after 24h
* Existing sessions will be invalidated after deployment

---

## 🧪 PR Checklist (Optional)

* [ ] Code follows project conventions
* [ ] Tests added or updated
* [ ] No breaking changes (or documented)
* [ ] PR is linked to a Jira ticket
* [ ] Manual testing completed

---

## ⚡ Best Practices

* Keep PRs small and focused
* Avoid mixing unrelated changes
* Use clear and descriptive titles
* Include screenshots or logs if relevant
* Prefer clarity over completeness in description

---

## 🚫 Common Mistakes

* Writing vague summaries (e.g. "fix stuff")
* Omitting testing steps
* Including too much low-level detail
* Leaving out context for reviewers
