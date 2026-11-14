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

## Verification

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

## Final verification boundary

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
