# PWDRZ-160 acceptance rework — 14 November 2026

Audience: contributors and acceptance reviewers. Owner: platform/integration owner.

## Scope and context map

Base: dc8743b (fetched origin/develop). Task branch: PWDRZ-160-current-spa-handoff.
Acceptance comment 10198 requires current operating instructions, not another migration.
The approved map covers root/frontend READMEs, documentation indexes, architecture,
frontend, monorepo/API/testing guides, AGENTS/Copilot context and the spike handoff.
Dependencies/reference patterns: existing package/project manifests, Vite proxy,
Gateway static/proxy/config, Docker/Compose, Spring session policy and managed E2E.
Tests remain existing frontend router/transport, Gateway host/proxy and workspace suites.
No public API, DB, application code, automation or dependency changes are required.

## Delivered correction

The root README is the setup entry point. Active guides describe adopted SPA,
separate dev/built topology, relative /api, optional frontend environment and
Spring-owned SESSION/CSRF. Gateway has no REST JWT policy. The backend-only
legacy WS key remains under PWDRZ-104. Root examples now name an existing HTTP test.
The old spike README is preserved byte-for-byte in historical-runbook.md; original
results receive only a historical notice. Original verification.json and screenshots
are unchanged. No historical run is promoted to current acceptance.

## Acceptance reconciliation

- Review 10198 / original AC 10: operating guidance corrected; actual full-stack
  launch still requires current runtime evidence below.
- Original AC 1–7: delivered migration retained; this rework changes documentation
  only. Old experiment isolation/JWT requirements are historical, superseded by
  adoption PR #78 and SESSION/CSRF PR #79; they must not be restored to current code.
- Original AC 8–9 / DoD: historical gates and failure probe stay at their original
  SHAs. Current full gates and runtime smoke are not assumed passed.
- Original AC 11: UI placeholders and independently owned product tasks retained.
- Original AC 12: no PR, merge, deployment or Jira change in this rework. Branch
  publication and commits were explicitly authorized by the user.

## Initial verification attempt

Root check passed 10/10 uncached; root build passed 6/6 uncached.
Gateway coverage passed 83 tests, lines 98.42%, statements 98.45%, branches 88.39%,
functions 95%; all unchanged gates passed. API drift check matched 98 generated files.
The initial overlapping verified/validate invocations exhausted Node process memory;
the single-worker frontend rerun also terminated with V8 heap allocation failure /
ERR_IPC_CHANNEL_CLOSED. The overlapping run additionally lost a coverage temporary
file. No assertion, gate, retry or timeout was changed to hide these failures.
Logs: ignored .workspace-artifacts/pwdrz160-{check,build,verified,validate,frontend-final}.log.

Docker Engine is unavailable: docker info cannot open dockerDesktopLinuxEngine.
A normal docker desktop start did not restore the engine. No reset/data repair was
performed. Dev/Compose/browser smoke, backend verify and full validate are therefore
not certified. Runtime acceptance remains open; do not mark this task done yet.

## Ownership and provisional review

Exact PWDRZ-160 and current PWDRZ-99 references and adjacent route/host/session
instructions reviewed. Resolved unticketed stale runtime/env guidance is directly
related to this handoff. Historical exports and baseline reports remain reference.
PWDRZ-74 owns user/release workflows, PWDRZ-22 C4/ADRs, PWDRZ-150 profile state,
and PWDRZ-104 real-time completion. None is declared unblocked by this correction.
No UI placeholder, disabled action or reserved Redis/Socket.IO integration changed.

## Initial verification boundary (before Docker recovery)

Implementation commit: f779239. All runtime/config/test source is identical to
base dc8743b; only Markdown and localTracking changed. Workspace/environment unit
tests passed 9/9. Changed-document local file links resolve (18 files checked),
git diff --check passed, and the historical runbook is byte-identical to the
pre-rework README. API drift check matched 98 files. Root check/build results
above apply to this documentation tree; backend build skips tests.

Full validate exited unsuccessfully: Docker readiness blocked backend/E2E, and
concurrent Node processes failed allocation. A clean git archive was extracted
without env/dependencies; its npm ci exited 1 without diagnostics, so a clean
install is not certified. No fresh dev/HMR, Compose/browser, backend verify,
negative probe or remote CI success is claimed.

Remaining acceptance: restore Linux Docker Engine and sufficient process memory,
then rerun root check/build/validate sequentially, clean npm ci, current README
dev/Compose smoke, and the managed negative probe followed by a fresh positive
run. Capture new source SHA and artifacts. The documentation defect is corrected,
but runtime reproduction and full AC/DoD remain open; local tracking stays blocked.
Jira is unchanged. No PR was created.

## Docker recovery and resumed acceptance — 14 November 2026

The user started Docker Desktop. Docker Engine 29.4.3 is accessible; no data reset
or repair was performed. These new results supersede the initial blocked state
above without changing historical experiment records. Runtime source tested:
1b41902 (identical to dc8743b); the only subsequent implementation edit clarifies
README readiness after the dev smoke below.

| Verification         | Observed result                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean install        | Git archive at f779239, no developer env/node_modules/dist; npm 11.12.1 ci installed 1048 packages, exit 0                                               |
| Clean frontend build | Passed with NEXT_PUBLIC_API_URL removed; Vite built static assets without a frontend server                                                              |
| Root validate        | 22 tasks passed uncached, parallel=1; VITEST_MIN/MAX_THREADS and MIN/MAX_FORKS=1; no gate/assertion/retry/config changes                                 |
| Frontend coverage    | 709 tests / 69 files; lines 98.11%, statements 97.40%, branches 92.66%, functions 96.16%; all gates passed                                               |
| Gateway coverage     | 83 tests; all four gates passed as above                                                                                                                 |
| Backend verify       | 367 tests, zero failures/errors/skips; JaCoCo lines 98.81%, branches 90.80%; owned PostgreSQL cleaned up                                                 |
| Managed E2E          | 24/24 actual browser/HTTP cases through built Express SPA and real Spring/Flyway/PostgreSQL; cleanup passed                                              |
| Docs                 | 254 local file/anchor links across 18 changed Markdown files resolve; historical runbook exact copy, verification.json unchanged                         |
| Dev smoke            | npm run dev from clean archive; real UI login via Vite /api proxy, protected settings reload and frontend HMR passed; owned process/stack cleanup exit 0 |
| Negative probe       | Expected exit 1 from wrong-heading browser assertion, screenshot/trace/error context saved; owned stack cleanup completed                                |

Positive validate run: e2e/artifacts/1794652034959-d89cbf00 (exit 0).
Negative probe: e2e/artifacts/1794652342359-389c2868 (exit 1, not interrupted).
Fresh positive after probe: e2e/artifacts/1794652436368-d8e6784e, 24/24 passed,
exit 0; stack cleanup completed.
Backend DB run: .workspace-artifacts/backend/1794651904425-2f1c6583/result.json.
Additional logs: .workspace-artifacts/pwdrz160-{validate-retry,clean-install-retry,
clean-build,dev-process,dev-smoke-retry,probe-retry,e2e-after-probe}.log;
dev-result.json is under the same pwdrz160 prefix. These are local ignored artifacts.

The first dev smoke issued an API request as soon as Vite was reachable and got
500 before Gateway readiness. Its result/process log is retained with the -first
suffix. The corrected smoke waits for Gateway /health and the proxied categories
API to return 200; README now states those exact readiness checks. No application
code was changed. This resolves the bounded unticketed readiness guidance gap.
Dev stop used owned process-tree termination, not claimed Ctrl+C verification;
forced termination/crash guarantees remain explicitly outside acceptance.

## Final AC/DoD reconciliation

| Original criterion           | Rework disposition                                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| AC 1 isolation/references    | Original pinned experiment remains historical; rework branch starts from fetched dc8743b and preserves other worktrees/staged work |
| AC 2 clean build             | Clean locked installation and static build demonstrated above                                                                      |
| AC 3 real hosted SPA         | Managed image builds from clean snapshot; all 24 real browser/HTTP scenarios passed                                                |
| AC 4 route/feature parity    | Existing routes, direct/reload/history/filter/role and feature assertions retained and passed; no product implementation change    |
| AC 5 auth/Query/Orval        | Current SESSION/CSRF supersedes historical JWT requirements; generated drift and lifecycle regressions pass                        |
| AC 6 HTTP/static/WS boundary | Full Gateway suite and SPA/browser boundary cases passed; live WS remains PWDRZ-104                                                |
| AC 7 workspace/config        | Existing manifests/scripts unchanged; root check/build and uncached validate pass                                                  |
| AC 8 gates/evidence          | All local service coverage/build/tooling and managed browser gates passed; no new remote CI dispatch claimed                       |
| AC 9 failure handling        | Real negative browser assertion, artifacts and cleanup observed; subsequent fresh positive result recorded below                   |
| AC 10 handoff                | Current root setup and spike index agree; historical reproduction/evidence clearly separated                                       |
| AC 11 limitations            | No feature placeholders absorbed; 74/22/104/150 keep their owners and prerequisites                                                |
| AC 12 authorization          | No PR, merge, deployment or Jira write; commits/push explicitly authorized for this rework                                         |

Review comment 10198 is addressed by the adopted topology, canonical root setup,
session-policy links, historical separation and observed current dev/built paths.
Clean environment and final-source evidence are distinguished from the original
spike. Remote CI is unrun, not passed; publication alone is not CI acceptance.

Completion: the documentation rework and all required local checks are complete.
The former Docker/memory blockers are resolved by Engine recovery and sequential
execution. Historical failed attempts remain above; no unresolved acceptance
remark from comment 10198 remains. Jira status is intentionally unchanged.
