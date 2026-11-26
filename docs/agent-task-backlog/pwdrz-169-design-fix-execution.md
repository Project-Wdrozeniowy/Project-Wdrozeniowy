# PWDRZ-169 design fix execution

Status: in progress. Branch: `PWDRZ-169-fix-insights-design-implementation`.
Approved plan: [design fix](pwdrz-169-design-fix-plan.md).

The historical backlog export has no PWDRZ-169 issue entry. This execution
record tracks the repair without inventing or replacing a Jira payload.

## Test-first evidence

2026-11-26: before application changes, ran from frontend:

```text
npx vitest run src/pages/post/ui/__tests__/PostPage.integration.test.tsx src/pages/post/ui/__tests__/PostInsights.test.tsx -t "on-demand analytics|starts author insights compact|represents an owner series failure" --reporter=dot
```

Observed: 4 failed, 69 skipped. Failures reproduce missing Analytics trigger,
missing author Expand/compact and series failure retaining summary figures.
These failures are the RED evidence, not successful acceptance.

## Verification

Functional and visual acceptance remain pending. No screenshot baseline is
approved until compared directly with its Figma reference.
