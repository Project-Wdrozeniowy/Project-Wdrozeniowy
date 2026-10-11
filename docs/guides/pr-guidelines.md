# Pull request guide

Use the short [PR template](../../.github/pull_request_template.md) as the form
you fill in on GitHub. This guide explains how to make that form useful to
someone who did not implement the change. Branches, commits, review, and merge
rules are in the [Git workflow](git-workflow.md).

## Required information

Every task PR links its primary Jira ticket (key or URL) and says **how the
result was checked**. Include the command or manual steps, relevant setup,
expected result, and any check you could not run. A passing CI badge without
the task-specific verification does not explain what behaviour was validated.

The template also offers Summary and Notes / Risks. A short summary of what
changed and why is recommended; it may include a concise `Changes` list for a
larger PR. Explain motivation when the reason is not obvious from the ticket.
Use Notes / Risks for migrations, compatibility, security, deployment effects,
known limitations, or a visible screenshot. Empty boilerplate is less useful
than an honest statement that a section does not apply.

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

These are illustrative steps, not a claim that PWDRZ-81 is implemented now.
Use the actual commands and outcomes for your own PR.

## Common mistakes

- `fix stuff`, a file list, or only a Jira key: reviewers cannot see the
  outcome or motivation.
- “Tested” without steps or results: another developer cannot reproduce it.
- Claiming a browser or cross-service flow works based only on a service unit
  test or a coverage percentage.
- Hiding an unrun check, migration impact, or an unresolved risk.
- Mixing unrelated tickets in one PR without naming the primary result and
  linked follow-up work.

Keep one coherent outcome per PR. If the diff is unusually large, explain why
it cannot be safely separated and suggest a review order. Before requesting a
review, use the [Definition of Done](README.md#definition-of-done) for the
affected boundaries.
