# PWDRZ-160 branch review

Review baseline: `2bd7d6c8d0f24a737304fee07174de5a0c03477a`.
Reviewed branch revision: `9b2a1d3275ce554e0fbdf2dc4a2373a4c5f30b61`.
Scope: the complete migration and route-organization diff, not just the last
commit. Original develop/baseline worktrees and Jira are outside the write scope.

The project `review-and-refactor` skill and all `.github/instructions/*.md`,
`.github/copilot-instructions.md`, AGENTS and relevant guides were read.
Existing files stay intact; no further module splitting is planned.

## Context map

Reviewed against source and directly adjacent tests before implementation.

### Files to modify

| File                                        | Purpose                                           | Changes needed                                                                                   |
| ------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `gateway/src/routes/spa.ts`                 | Static serving, browser fallback, build preflight | Verify HTML content negotiation and actual index-file precondition; fix only reproduced failures |
| `gateway/src/routes/__tests__/spa.test.ts`  | Actual HTTP host and startup contract tests       | Add regression cases for rejected/case-insensitive HTML Accept and a non-file index              |
| Spike report/verification and localTracking | Review outcome/evidence                           | Separate this review's checks from earlier browser acceptance; preserve Jira payload             |

### Dependencies

| File/area                                                        | Relationship/review focus                                                                           |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| gateway app/config/index/proxies/middleware                      | Middleware order, API-only JWT/quota, transport matching, CSP, startup preflight                    |
| frontend App/router/layouts/providers/pages/widgets/features/API | Route/URL parity, lazy imports, initialization, Query/Orval, FSD imports                            |
| frontend Vite/HTML/CSS/ESLint/TypeScript and root lock           | Runtime removal, build output, browser configuration, preserved dependency versions                 |
| Docker/Compose, Nx targets, workspace tools and workflows        | Combined host artifact, build dependencies/cache, dev process ownership, selective CI installation  |
| E2E launcher/specs                                               | Static review of snapshot/isolation/readiness/parity coverage; execution explicitly skipped by user |
| Guides/runbooks/results                                          | Reproducibility and distinction between current checks and historical evidence                      |

### Test files

| Test                                                                       | Coverage                                                                                       |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Gateway SPA, config, app, auth/proxy suites                                | Actual response/cache/MIME/fallback/quota/security and regression cases                        |
| Frontend actual-router, boundary, guard/provider and moved component tests | All routes, redirects/session state, public entries and preserved UI behavior                  |
| Workspace/E2E infrastructure unit tests                                    | Dev preflight, process cancellation, build delegation, secret-free snapshot and safe ownership |
| API/codegen checks                                                         | Full committed generated output and invalid-input/determinism checks                           |

### Reference patterns

- Express's installed Accept negotiation, existing error message and static/cache policy.
- Actual-router tests use the same route tree; no live router singleton in tests.
- Existing service coverage gates stay independent and unchanged.
- Immutable backend/schema/OpenAPI and generated bindings remain out of refactoring scope.

### Risk assessment

- Public API/schema changes: none intended; no database migration.
- Configuration/automation changes: none planned. Existing automation is reviewed,
  not changed or remotely triggered.
- Main risk: accidentally broadening fallback into API/static/non-navigation traffic.
- Verification: regression-first gateway tests, root static checks/build,
  frontend/gateway coverage and workspace infrastructure tests.
- E2E/full-stack validate are skipped by explicit user instruction. No replacement
  browser/backend acceptance claim will be made.

Status: reviewed; reproduced defects fixed and locally verified.

## Findings and fixes

☢️ Issue — HTML fallback ignored content negotiation (fixed)

A client explicitly rejecting HTML received the SPA document with HTTP 200,
while a valid uppercase HTML media type received HTTP 404.
Fix: retain the explicit navigation-HTML boundary, use Express Accept negotiation
for quality values, recognize case-insensitive media types, and emit `Vary: Accept`
on both fallback and rejected fallback responses. API/WS, missing assets, absent
Accept and wildcard-only requests keep their existing non-fallback behavior.
The tests reproduce `q=0`, wildcard precedence, a lookalike media type and uppercase
`TEXT/HTML` through the real app rather than a mocked header parser.

☢️ Issue — Startup accepted a non-file entry document (fixed)

A directory named `index.html` passed preflight, so the host could start with an
unusable frontend artifact.
Fix: require a regular entry file using filesystem metadata before listening;
missing paths and metadata errors retain the existing actionable startup error.
A real directory fixture verifies the previously accepted invalid build.

No critical issue was identified in the reviewed changes. These are bounded host
edge-case corrections; no frontend architecture, auth or backend redesign follows
from them.

## Review coverage

| Area                          | Reviewed result                                                                                                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend bootstrap and routes | Single Data Router, ten page entries, pathless guards/layouts, dynamic slug, search/query navigation, error UI and scroll/focus composition match the intended SPA; removed Next imports/directives are not needed in this browser build |
| FSD reorganization            | Page/widget public boundaries and relocated integration tests agree with the import graph; no page-peer or upward production imports; existing store/utils remain explicitly outside the reorganization                                  |
| Auth/Query/API                | Memory token, cookie refresh, bootstrap, one retry and query/session ownership preserved; no invented backend operations or generated binding edits                                                                                      |
| Gateway host                  | API/WS handling precedes static/fallback; security, MIME/cache, static/API quota and non-navigation behavior are covered; the two reproduced defects above are fixed in the existing module                                              |
| Dependencies                  | Workspace manifests and root lock remain coherent; overlapping package paths retain baseline versions; required Vite/router/font/lint dependencies replace Next-specific dependencies without an incidental general upgrade              |
| Docker/Nx/dev/CI              | Combined gateway/frontend artifact, source snapshot, build inputs/outputs, production API prefix and selective installs reviewed against actual commands; no automation changes or remote execution during this review                   |
| E2E sources                   | Launcher ownership, generated credentials, disposable Compose project, new SPA cases and unchanged original flows reviewed statically; execution skipped by user instruction                                                             |
| Docs and limitations          | Current route organization is documented separately from initial migration acceptance; historical evidence is preserved rather than attributed to untested current revisions                                                             |

## Verification

- Regression-first SPA tests: **5 failed / 13 passed** before the fix; **18/18**
  passed after the fix. The full gateway suite now has **69 passing tests**.
- Final root `check`: **10/10 targets passed**. Gateway `verified`:
  **6/6 targets passed**, with fresh coverage/build/lint/typecheck/format checks.
- Frontend: **705/705 tests**, production build, lint, typecheck, format, Orval
  drift (all 75 generated files) and codegen tests passed. The combined initial
  frontend/gateway verification command itself failed; its frontend tasks passed.
- Workspace and E2E infrastructure **unit** tests: **9/9 passed**. These do not
  launch browsers, Docker or a backend and are not presented as E2E evidence.
- Coverage gates are unchanged. Observed frontend lines/branches/functions:
  **98.20 / 93.23 / 96.47%**; gateway **97.56 / 90.00 / 93.94%**. All statement
  gates also passed. No thresholds, retries, exclusions or timeouts were relaxed.
- The first broad run caught a mandatory-braces lint error in the new fix;
  braces were corrected. It also exceeded the existing five-second quota-test
  timeout while redundant check/verification processes ran concurrently. The
  final normal standalone gateway verification passed with the original timeout
  and assertions; no continued worker/open-handle warning was observed there.
- E2E/full-stack `validate`, backend tests and a new Docker/remote CI execution
  were not run in this review. Backend Java/schema/OpenAPI and generated bindings
  have no diff against the pinned base. Earlier real-stack evidence remains
  evidence only for its recorded initial-migration revision.
- Exact command logs live in shared ignored `evidence/review/`: `regressions-before.log`,
  `regressions-after.log`, `verified.log`, `check-final.log`, `gateway-final.log`,
  and `tooling.log`. Current accepted source is identified in `verification.json`.

The targeted provisional review covers PWDRZ-160 and adjacent route/auth/host
markers. Post-body/feed-action placeholders, dashboard/live samples, PWDRZ-67
comments acceptance, PWDRZ-150 state ownership and PWDRZ-104 realtime work keep
their existing prerequisites and owners. No marker is expired merely because the
migration or this review is complete; no other ticket is claimed unblocked.

## Summary

The complete migration diff was reviewed and two reproduced SPA-host edge cases
were corrected without splitting modules or changing the experimental architecture.
Applicable local checks pass. The branch remains an isolated comparison experiment;
this review is not merge/adoption approval, and browser/backend acceptance for the
latest revision remains unverified because the user requested skipping E2E.

## What is good

- Real API/auth/Query/Orval boundaries and independent coverage gates were preserved.
- The production frontend ships through the existing Express host with explicit
  static/API/transport handling and package ownership.
- Routes/pages/layouts have clear owners and source-backed dependency checks.
- Historical acceptance and current unrun checks are distinguished in the report.
