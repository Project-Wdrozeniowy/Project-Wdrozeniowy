# PWDRZ-169 design fix execution

Status: implementation delivered; verification limits recorded below.
Branch: `PWDRZ-169-fix-insights-design-implementation`.
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

## Delivered behavior

- Analytics is right-aligned in post actions, hidden initially, with no analytics
  reads until activated. Unavailable analytics keep a grey aria-disabled button
  with a hover/focus/touch explanation. Comments are not height-limited/remounted.
- Outer visibility and inner compact/expanded/table states are independent.
  Another post/account resets visibility before displaying prior presentation.
- Author compact has the real seven-day mini-chart/subtotal; expanded has the
  7/30-day chart, table, measured/null/partial distinctions and private context.
- Public/author shells, labels, exact exported icons, mobile layout, zero/loading/
  partial/error/Retry states follow the Figma references. Refresh was removed.
- Retry checks summary/article/owner-series together, preserves focus appropriately,
  and never exposes server internals or presents stale figures as successful.
- The shared dashboard presentation and backend contracts/schema are unchanged.

## Verification actually performed

Source: approved-plan base `7d7f91c` plus the recorded working-tree implementation,
then UI commit `08e163e` and subsequent CSS/test/evidence changes. Managed launcher
run.json explicitly records that its source is a working-tree snapshot, not just
the clean commit named there. No result is claimed for an untested clean SHA.

| Check                                   | Result / evidence                                                                                                                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend typecheck, lint, format, build | Passed; `.workspace-artifacts/169-{lint,format,build}.log`; final typecheck repeated after changes                                                                                                                                                     |
| API drift                               | Passed: 102 generated files match the validated contract; `169-api.log`                                                                                                                                                                                |
| Full frontend coverage                  | 140 files / 1607 tests passed with `--maxWorkers=2`; statements 97.78%, branches 94.10%, functions 97.55%, lines 98.51%; `169-coverage.log`                                                                                                            |
| Affected unit/integration tests         | 4 files / 80 tests passed after the added account/draft scenarios; `169-targeted.log`                                                                                                                                                                  |
| E2E typecheck and infra                 | Passed; infra 3 tests; `169-infra.log`                                                                                                                                                                                                                 |
| Real-stack focused E2E                  | 4 passed, no retries, one worker; `e2e/artifacts/1795709493493-411b132a/browser-tests.log`                                                                                                                                                             |
| Broader real-stack E2E snapshot         | 77 passed / 1 failed: the old PWDRZ-166 browser assertion still clicked removed Refresh. Updated that test to Analytics show/hide/reopen. Its updated browser scenario has NOT been rerun. The corresponding frontend opening integration test passed. |
| Repeat final full runs                  | Stopped at the user's request; not reported as passed                                                                                                                                                                                                  |
| Backend/gateway standalone gates        | Not rerun: source unchanged, and user requested no further full run. Real-stack focused E2E exercised both services.                                                                                                                                   |

The first parallel coverage attempt exposed four props-naming failures and four
resource-contention timeouts. Props now follow repository naming; the subsequent
full run with two workers passed, without increased timeouts, retries, exclusions
or lowered coverage gates. A repeat full run was then cancelled as requested.

Managed stacks use disposable data and separate ports; the interrupted full run's
owned project `orbita-e2e-1795709648624-ccb0bafb` was explicitly cleaned up. No
developer stack or PostgreSQL volume was reset.

## Visual evidence and its limits

The 26 exact card references are linked in the approved plan. Downloaded reference
PNGs and controlled browser renders, pairs, overlays and unmasked pixel diffs live
in `.workspace-artifacts/pwdrz-169-design/`; `manifest.json` records geometry and
`comparison.json` records raw differences without a passing tolerance. The scripts
are `e2e/scripts/verify-insights-design.mjs` and `compare-insights-design.mjs`.
Use the Vite development preview on 127.0.0.1:3199; the HTML/TSX fixture is under
frontend/src/test and is not a production app route or proof of the backend.

Direct comparisons corrected mobile chart height, badge wrapping, period-switch
placement, notices, chart axes/bars, compact layout, error spacing and typography.
Additional page screenshots cover enabled/disabled, closed/open and the accessible
explanation at 1280/768/390/320px, with assertions for zero premature/disabled reads,
retained trigger focus and no horizontal page overflow. New trigger/tooltip is
the user's approved design addition, not a pre-existing Figma frame.

The controlled sample data deliberately reproduces Figma's values/dates, including
its illustrative collection/window dates. Production uses API values, never these
fixtures. All eleven static SVG files are local and occupy their documented slots.

**Do not describe this as byte-for-byte pixel identity.** The paired images retain
visible text-rasterization differences between Figma's renderer and local Chromium;
the data table uses Menlo with a platform Consolas fallback. Dark-mode functional
evidence exists in the real-stack scenario; a separate dark Figma screenshot was
not compared. These limitations remain explicit rather than being hidden behind
pixel masks or broad tolerances. Strict 1:1 visual sign-off is not asserted while
these differences remain. The user requested finishing without another full run;
that does not retroactively turn an unrun check into a pass.

## Targeted provisional review

Reviewed the post insights feature, adjacent analytics hooks/chart and guides for
PWDRZ-169/171 markers and provisional mechanisms. Removed obsolete refresh-error
constants/docs; no expired 169/171 feature guard was found. Comments acceptance
remains PWDRZ-67; no unrelated comments redesign, pagination change or backend
work was added. No new claim that another Jira owner's task is unblocked, and no
Jira/Figma updates or messages were sent.
