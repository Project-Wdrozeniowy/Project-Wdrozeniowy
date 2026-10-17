# PWDRZ-117 — browser and cross-service gate execution

## Accepted decisions and starting point

The user accepted D0–D8 A: start after PWDRZ-118 merges; Playwright in a separate
`e2e/` package; a real isolated stack; API fixtures; four browser scenarios and
one protected HTTP integration case; Chromium; one worker; zero retries; a
separate workflow and required check. Optional component-browser tooling is not
needed for this initial scope: existing Vitest/RTL suites already cover local UI.

PR #57 merged on 2026-10-17. Starting develop SHA:
`62884879c97eee26ebe7d9a162c0b5bada207f03`.
Working branch: `PWDRZ-117-browser-integration-gate`.

## Context map (reviewed before implementation)

| Files | Role and changes |
| --- | --- |
| `e2e/package*.json`, TypeScript/Playwright config | Independent exact runner/tool versions, Chromium, one worker, no retries |
| `e2e/compose.yml`, `e2e/scripts/` | Ephemeral real PostgreSQL/backend/gateway plus host frontend production build/start; owned-resource cleanup and logs |
| `e2e/support/`, `e2e/tests/` | API-created unique identities, four browser cases, one anonymous-write integration case, explicit failure probe |
| `.github/workflows/e2e.yml` | Separate always-applicable initial check; no selective CI (PWDRZ-137) |
| `e2e/README.md`, guides and agent instructions | Reproducible environment, commands, ownership, CI evidence |
| shared Jira backlog | LocalTracking only; no Jira payload/status changes |

Existing dependencies: backend/gateway Dockerfile, auth API/browser controls,
forum create/feed, Flyway V1–V7/default categories, Node 24 and Docker. No
application implementation, migration or coverage gate change is planned.

## Provisional functionality and boundaries

Registration displayName mapping remains PWDRZ-128; interests remains PWDRZ-154.
Browser registration does not claim persistence of either provisional field.
The post detail page is a placeholder: forum E2E asserts real publication and
feed persistence, not completed detail/comment UI. Comments remain PWDRZ-142/67;
real-time delivery remains PWDRZ-104. Existing task PWDRZ-79 is design only.
Fixtures are setup, not browser evidence. The anonymous HTTP case is integration,
not browser E2E. Service-level tests and PWDRZ-118 thresholds remain independent.

## Implementation

Pinned package versions: Playwright 1.64.1, TypeScript 5.9.3, @types/node
24.19.2, Prettier 3.8.1. Installed Chromium build: 1248, Chrome for Testing
156.0.8078.4. Local Node 24.15.0 / npm 11.12.1, Docker Engine 29.4.3 and
Compose 5.1.3; actual test PostgreSQL logs report 16.14.

The runner snapshots frontend/gateway/backend source excluding `.env*`,
node_modules and generated output, uses existing Dockerfiles and builds the
frontend in its own temporary directory. It never overwrites frontend `.next`.
Compose uses a unique `orbita-e2e-<run-id>` project, fresh tmpfs PostgreSQL, no
host DB port and generated credentials/JWT secret. Only localhost frontend 3101,
gateway 3100 and backend 8180 are exposed; existing listeners are not reused.
Readiness requires HTTP 200 from the real backend/gateway category path and
frontend login page. All seven Flyway migrations and normal JPA validate run.

Teardown captures service logs, stops the owned frontend process tree, removes
only its Compose resources and local image tags, then deletes its verified
runtime child directory. Returned process exit status preserves browser failure.
Infrastructure tests check cleanup path bounds, snapshot secret exclusion and
port validation. `stopTree` also avoids already-exited/signalled children and
duplicate termination requests; this does not alter application behavior.

The new workflow uses all PRs and main/develop pushes, with no paths filter or
continue-on-error. It installs pinned tooling/Chromium, checks infra/type/format,
runs the managed suite and uploads failure evidence for seven days. The manual
negative probe is separate from normal test selection. GitHub manual dispatch
was subsequently verified using registered workflow ID 387843571 on this branch.

## Local verification (2026-10-17)

Commands from `e2e/`, invoked with bundled npm 11.12.1 on this Windows host:

```powershell
$nodeExe = 'C:\Program Files\nodejs\node.exe'
$npmCli = 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js'
& $nodeExe $npmCli ci --no-audit --no-fund
& $nodeExe $npmCli run browsers:install
& $nodeExe $npmCli run typecheck
& $nodeExe $npmCli run format:check
& $nodeExe $npmCli run test:infra
& $nodeExe $npmCli test
& $nodeExe $npmCli run test:probe
```

All run artifacts below are ignored under `e2e/artifacts/<run-id>/`; they are
not checked-in screenshots or coverage output. Source SHA is the starting
62884879 plus the documented uncommitted E2E implementation. No production
source, service dependencies, migrations or coverage configurations changed.

| Run | Actual result |
| --- | --- |
| `1792257592818-ad47bb97` | Initial run: 4 pass / 1 fail, exit 1. The logout assertion's unscoped Sign in locator matched header and sidebar. The test was corrected to the header banner; this was a test locator defect, not an application defect. Teardown succeeded. |
| `1792257984969-8d4914dd` | Full clean run: **5 pass**, one worker, zero retries, browser duration 5.2s, launcher exit 0. Fresh migrations and real gateway statuses verified in service logs; runtime and containers removed. |
| `1792258154214-b7b26df8` | Explicit failure probe: **1 failed**, expected launcher exit 1. It first found Welcome Back on the real login screen, then failed the deliberately nonexistent heading assertion after 10s. Trace, screenshot and HTML report saved; teardown succeeded. |
| `1792258313036-2acdc19a` | Final repeated full run after the negative probe and process-cleanup guard refinement: **5 pass**, one worker, zero retries, browser duration 5.2s, launcher exit 0. Fresh accounts/database and successful teardown again. |

The positive suite verifies browser registration 201/profile 200; login 200;
reload refresh 200 and matching profile; logout 204; post-logout reload refresh
401 and guest UI; bad credentials 401 with UI error; authenticated browser post
201, visible publication feedback and persisted feed/API content after reload.
The independent HTTP case observes anonymous post 401 and no corresponding
persisted record. No route interception or service mocks are used.

Reproducible `npm ci` installed seven package dependencies. Typecheck, package
format and all three infrastructure tests pass. Compose config and workflow YAML
parse; the new workflow has no path filters/allowed-failure steps and uploads
artifacts with `always()`. Original 98 backlog entries were compared structurally
and are unchanged; a current PWDRZ-117 evidence snapshot with LocalTracking was
appended (historical import metadata still describes the original import).

No new FE/BE defect was found in these runs. Existing PWDRZ-128/154 limitations
are referenced, not silently implemented or asserted as final contract. The
placeholder post detail screen is not an accepted completed flow. No additional
component/browser framework or duplicated RTL matrix was introduced.

## Acceptance audit

| Criterion from PWDRZ-117 | Evidence / remaining work |
| --- | --- |
| Tool, reproducible startup/env and data isolation/cleanup documented | Implemented in e2e README/package/launcher/Compose. Locked install, two clean full passes, failed-probe cleanup and infrastructure guard tests verified locally. |
| Auth and a protected gateway request end to end; available forum UI flow | Four real-browser scenarios pass, including post creation through the JWT-protected route; feed reload and real API confirm persistence. Fifth anonymous HTTP case is explicitly integration. |
| Local rerun and required applicable CI check | Local rerun passes. Actual PR run 39054846497 passes all five cases. Active develop/main/staging rules require E2E (Chromium) from GitHub Actions with strict up-to-date policy; readback verifies the effective rule. Existing admin bypass is preserved. |
| Deliberately failing browser scenario fails gate; compliant run shown | Local probe exits 1 and normal runs exit 0. GitHub run 39055451049 fails the intended browser assertion, preserves exit 1, uploads trace/screenshot and completes teardown; PR run 39054846497 passes five cases. See remote evidence below for event/SHA distinctions. |
| Discovered FE/BE defects linked separately | No new application defect found. Initial locator error was fixed only in test code. Existing provisional PWDRZ-128/154 and missing detail/comments remain explicit, without mocks or invented successful contract. |

No runtime directories, test containers from the final positive/negative runs
or listeners on 3100/3101/8180 remain (read-only process/Docker verification).
All existing frontend/gateway/backend source, their package manifests and
coverage configs are unchanged. Workflow YAML/Compose parse, final package
typecheck/format/infra tests and diff whitespace checks pass. Generated artifacts,
source snapshots and dependencies are confirmed ignored by Git.

Documentation now points to the actual managed suite and this verification
status rather than asserting that no suite exists. English/Russian guide sections
are aligned. The directly related stale AGENTS forum-mocked statement and token
module path were corrected to the verified current source; no feature was enabled.
Targeted PWDRZ-117/current-branch marker review resolved the E2E CI setup
requirement and retained other owners' provisional markers. No task is claimed newly
unblocked or owner contacted.

## Published CI and required-check evidence (2026-10-17)

The user published [PR #58](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/pull/58)
at head `666ba667ded78105a073af655a357a30da8d0db0`, targeting develop
`62884879c97eee26ebe7d9a162c0b5bada207f03`. The PR workflow checked out GitHub's
test merge SHA `43cfe750eed128d5f2687d3e73d3fade94a65097`; this is the SHA in
its run.json, not a different implementation revision. CI used Ubuntu and Node
24.21.0. Artifacts were downloaded and inspected, not inferred from a green icon.

| Run | Observed result |
| --- | --- |
| [39054846497 — PR suite](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions/runs/39054846497) | Success, 5 passed in 7.4s, exit 0, artifacts uploaded. Tests 39054846467 and Lint 39054846468 also pass at the same head. |
| [39055451049 — controlled failure](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions/runs/39055451049) | workflow_dispatch on head 666ba667; failure, exactly 1 deliberately failing heading assertion, exit 1. Screenshot, trace and HTML report uploaded; owned containers, network and images removed. |
| [39055714957 — positive after failure](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions/runs/39055714957) | workflow_dispatch on the same head 666ba667; success, 5 passed in 4.7s, exit 0, fresh stack and cleanup verified from downloaded artifacts. |

The user selected strict mode (A). Before mutation the exact minimal action and
branches were announced. Rulesets develop 14868458, main 14868413 and staging
14868510 now each require `E2E (Chromium)`, integration_id 15368 (github-actions),
strict_required_status_checks_policy=true and do_not_enforce_on_create=false.
Readback and structural comparison confirm all pre-existing rules, conditions,
enforcement and bypass actors are unchanged. The effective develop branch rule
was also queried. Before/request/after snapshots are ignored artifacts under
`e2e/artifacts/ruleset-verification/`.
`gh pr checks 58 --required` lists E2E (Chromium) as passing, linked to the actual
PR run 39054846497. Thus the required context is recognized on the open PR.

The controlled dispatch proves a real browser assertion fails the CI job. It did
not replace the successful pull_request check on the test merge commit: GitHub
still reported PR #58 clean during the negative dispatch. No negative PR merge
attempt or observed merge rejection is claimed. Required-check enforcement is
verified from active rules and its expected GitHub Actions source. Existing
OrganizationAdmin always-bypass on develop/main remains; staging has no bypass.
Strict mode can require rerunning after develop advances. Wider branch policy
and selective execution remain PWDRZ-137.

Jira PWDRZ-117 was reopened for this final audit: all five acceptance criteria
match the table above; no comments, subtasks or linked blockers were present.
The agent did not commit, push, merge the PR or transition Jira. Final evidence
documentation changes remain in the working copy for the user's publication.
Implementation and all five acceptance criteria are verified; the task is ready
for review/merge and closure through the team's normal workflow. This statement
does not claim that PR #58 has already merged or Jira has transitioned to Done.
