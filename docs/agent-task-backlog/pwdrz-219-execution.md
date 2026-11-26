# PWDRZ-219 execution record

Implementation approved on 2026-11-26. Isolated worktree on `PWDRZ-219-storage-preferences`, based on `develop`. After accepting the implementation, the user authorized committing it, pushing the task branch with an upstream and removing the local worktree.

## Approved decisions

- Local consent version 2; independent theme and recent-search permissions.
- Fixed 180-day lifetime from an explicit decision; no rolling extension.
- Legacy shared decisions are invalidated and optional data removed.
- Navigation restoration remains necessary session-scoped functionality.
- The user approved `docs/design/storage-preferences-prototype.html` (“Ну выглядит неплохо”). This standalone reference replaces Figma acceptance for this task under the explicit session decision.
- Storage failures disable optional I/O and remain visible; no successful deletion is claimed when blocked.

## Verification

Test-first evidence: new storage permission tests failed 14/14 before implementation; consumer tests failed 7/9 before updating the theme/history/bootstrap; new state tests failed 5/6 before updating Zustand. The provider suite initially failed to resolve its not-yet-created module.

Implemented: independent version-2 permission record, fixed lifetime, legacy invalidation, selective cleanup, explicit failure results with document-local fail-closed protection, early theme validation, explicit theme selection, history refresh notification, and the cross-tab/focus/pageshow/expiry provider. The approved bottom panel and native preferences dialog are integrated in all layouts; measured panel/navigation offsets keep footer controls and toasts clear. User copy contains no internal storage identifiers.

Initial targeted suites passed 92 storage/theme/state/provider tests; the new UI's seven tests failed against the old interface and then passed. Additional failing-first cases exposed document-local failure accidentally erasing a shared answer, unreadable answers being treated as missing, failed cleanup retaining an effective grant, and lost focus after a cross-tab draft reset. All were corrected. Active expiry now has its own accurate notice rather than claiming a change in another tab.

Frontend typecheck, lint, format check, production build and API bindings check pass. Orval confirms 102 generated files match the unchanged contract. E2E workspace typecheck/format checks pass. The build retains its existing large-chunk and dependency annotation warnings.

Managed real-stack full E2E run `1795714203906-71866502`: **97/97 passed**, zero retries, Chromium, isolated source snapshot, ports 3210/8290. The default 3100 port was occupied and was not reused. The launcher completed owned stack teardown with exit 0. Evidence: `e2e/artifacts/1795714203906-71866502/{browser-tests.log,run.json,report/}`. An earlier run found two test defects: a Date.now-dependent test title differed between discovery/workers, and the focus assertion incorrectly rejected native traversal into browser chrome. Stable case titles and explicit background-page exclusion corrected them; no custom focus trap or retry was added.

Final frontend coverage run (`--maxWorkers=4`): **143 files / 1,637 tests passed**. Istanbul: statements 98.20%, branches 94.33%, functions 97.75%, lines 98.83%; all four unchanged service gates pass. Evidence: `.workspace-artifacts/pwdrz-219/frontend-coverage-verified.log` and the ignored `frontend/coverage/` report. Earlier runs overlapped ongoing test-first changes and/or hit local resource-related timeouts; the final run started after the TypeScript implementation stabilized, with no test timeout or coverage exclusions changed.

Final managed consent run `1795714992161-625b8ec4`: **24/24 passed**, zero retries, including active-page expiry and the exact visual comparisons below. This targeted final run follows the full 97-scenario run; it does not claim that all 98 scenarios were rerun together after adding the extra expiry case. Both managed runs exited 0 and cleaned their owned stacks. Active-expiry simulation advances in nine 20-day steps because the pinned Playwright clock coerces each fast-forward delta to a signed 32-bit integer; no application timer or lifetime was shortened for the test.

Implementation and applicable local verification are complete. The subsequent Git handoff preserves the task branch remotely and removes the local worktree; Jira completion status is outside this handoff.

Before worktree removal, the successful full/final consent E2E reports and screenshots, frontend coverage report and final coverage/build logs were copied to `D:/Projects/Wrdz/Project-Wdrozeniowy/.workspace-artifacts/pwdrz-219/handoff-20261126/` (948 files). Final log hashes were checked and the primary checkout's tracked/untracked Git status was unchanged. These local evidence artifacts remain ignored and are not pushed.

## Visual and accessibility evidence

Each responsive scenario attaches application and independent approved-reference screenshots for the bottom panel and mixed dialog, plus the application's reopened saved state. Eight variants cover 1440/768/390/320px in light and dark. Paths are under the successful run's `test-results/consent-storage-preferences-responsive-evidence-*` directories (`bottom-panel.png`, `mixed-preferences.png`, `reopened-preferences.png`, `reference-panel.png`, `reference-mixed-preferences.png`). The reference renderer embeds the same local font and does not derive a baseline from the application.

The final consent run also contains all eight screenshot pairs. Visual inspection found and resolved a small heading-weight mismatch (650 versus the reference's 700). Each responsive case now asserts identical dialog bounds and byte-identical PNG pixels for its interior, inset 16px to exclude rounded corners exposing different underlying pages. All eight comparisons pass against the independent approved reference. This is a component comparison, not a claim that the mock dashboard and real application backgrounds match.

The mobile panel's vertical position follows the real navigation height, whereas the prototype has a 64px placeholder navigation. Automated checks cover every variant's horizontal fit, panel/nav separation and unobscured focused footer button. Native Chromium tests cover accessible roles/names, initial focus, background exclusion, Escape/Close, cancellation and focus return on main/login/register. No live screen-reader audit or verified WCAG/legal conformance is claimed.

## Targeted provisional-functionality review

Exact-key searches for PWDRZ-219/PWDRZ-197 covered source, public bootstrap, gateway/backend, E2E, guides and hidden agent/GitHub instructions; adjacent storage/theme/consent code was checked for provisional guards and dependency markers. No expired in-scope marker or newly unblocked owner task was found. Settings' appearance section still awaits a separate product decision about a dedicated appearance form/system option; privacy/notification preference sections still lack their own server contracts. These prerequisites are not satisfied by browser persistence controls and remain unchanged. No backend, gateway, session policy or analytics collection changes were made.

Node 24.15.0 and bundled npm 11.12.1 installed the locked dependencies successfully. Docker Engine 29.4.3 is accessible outside the restricted execution context.

## Context map (reviewed with the implementation plan)

| Files to modify                                                                   | Purpose                                             |
| --------------------------------------------------------------------------------- | --------------------------------------------------- |
| shared/lib/storageConsent.ts, theme.ts, recentSearches.ts, useRecentSearches.ts   | Independent permissions and controlled consumers    |
| store/slices/consentSlice.ts, uiSlice.ts                                          | Saved choice, UI state and explicit theme selection |
| public/theme-init.js, app/providers/ThemeProvider.tsx, StorageConsentProvider.tsx | First paint, cross-tab and active-page expiry       |
| widgets/consent-banner and Root/Main/Auth layouts                                 | Approved panel/dialog, focus and measured offsets   |
| ToastProvider and MobileTabBar integration                                        | Keep controls and notifications visible             |
| Adjacent tests, e2e consent spec and support fixture                              | Actual behaviour and returning visitors             |
| Frontend guide and execution record                                               | Accurate storage inventory and evidence             |

Dependencies: existing theme tokens, native dialog semantics, application footer controls, React Router restoration, session-change notifications. Reference patterns: current classic theme bootstrap and its parity tests; existing themed form controls. No public HTTP API, database migration, authentication policy or gateway configuration changes.
