# PWDRZ-118 — final decisions and gate verification

This is the current decision record. The earlier baseline, scope audit, provider
comparison and risk-package reports retain their historical measurements.
Starting repository SHA: `9167dc7d849f90ff57ea89d6e07fdbc998fa5326`.

## Context map (reviewed before implementation)

| Files | Purpose |
| --- | --- |
| `frontend/vitest.config.ts` | Apply the selected provider; scope and thresholds stay unchanged at this step |
| `frontend/package.json`, `frontend/package-lock.json` | Declare Istanbul and compatible exact Vitest/provider versions for reproducible installation |
| `frontend/src/**/__tests__/**` | Run existing tests; no test additions or assertion changes are needed for the provider decision |
| `docs/agent-task-backlog/pwdrz-118-*.md` | Preserve experiment history and record accepted decisions/verification |
| `docs/agent-task-backlog/pwdrz-jira-tasks.json` | Update only PWDRZ-118 local execution tracking |

Reference: the 496-test controlled comparison and the later 509-test risk-package
measurement. Dependencies: matching Vitest/provider 3.2.4; existing React/Vite
test setup. No production API, DB or coverage-scope change is planned in this step.

## Decision 1 — frontend provider

On 2026-10-17 the user selected **A: Istanbul**. Rationale: the controlled
comparison included all 115 executable files with both providers, but current
V8 produced synthetic covered branch/function counters for some unimported
files. Istanbul reported their real unexecuted branches/functions. The choice
is based on counter interpretation, not a higher line percentage.

Implementation: use `provider: 'istanbul'`; declare
`@vitest/coverage-istanbul: 3.2.4` and `vitest: 3.2.4`; remove the unused direct
V8 provider dependency. Matching exact versions preserve the tested runner
and avoid peer-version drift. Scope, test suites and all existing 65% thresholds
are unchanged pending separate metric/threshold decisions.

Verification completed on 2026-10-17:

* `npm ci` installed 529 packages successfully from the updated lockfile; the
  subsequent normal `npm run test:coverage` script selected Istanbul without a
  provider override. Vitest and provider both resolve to 3.2.4.
* 48 suites / 509 tests pass. Lines: 779/895 = 87.03%; branches: 611/705 = 86.66%;
  functions: 290/355 = 81.69%; statements: 879/1005 = 87.46%. These match the
  post-risk-package experiment. No production source/test assertions changed.
* Frontend typecheck, lint, format:check and `git diff --check` pass. Existing
  React act warnings remain; this is not a warning-free run.
* Lockfile review found no version changes to existing packages. npm also
  normalized bundled optional Tailwind wasm dependency metadata; the Tailwind
  parent version did not change. V8-only dependencies were removed, while
  Istanbul's instrument dependency was added.

Environment: Node 24.15.0, npm 11.12.1. The host's `npm.cmd` now forwards to a
globally installed npm 12.0.2, whose initial lockfile attempt failed with
EALLOWREMOTE before completion. Reproducible verification used the bundled
npm 11.12.1 from the original baseline directly, without changing global config:

```powershell
# From frontend/
& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' ci --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000
& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run test:coverage
```

Ignored logs: `backend/target/pwdrz118-istanbul-ci.log`,
`backend/target/pwdrz118-final-provider-coverage.log`.
Current generated reports: `frontend/coverage/`.
No GitHub CI run for this uncommitted switch is claimed; the final CI acceptance
check remains pending. The targeted PWDRZ-118 marker check found coverage-policy
references whose prerequisite is final task completion, so none was removed or
declared unblocked during this provider-only step.

## Decision 2 — mandatory frontend metrics

On 2026-10-17 the user selected **B: all four metrics are mandatory**:
lines, branches, functions and statements. Each metric must meet its own
threshold; passing another metric does not compensate for a failure.
None of these four is diagnostic-only.

The existing `coverage.thresholds` already declares all four numeric entries,
so this decision requires no configuration change. Their current 65% values
remain interim values, not the approved final thresholds. The Istanbul run
recorded above passes all four interim gates. Configuration inspection confirms
that all four entries are present; controlled failures against the final values
remain pending until those values are selected.

Rationale: line execution, branching, invoked functions and statements provide
complementary checks. Istanbul gives meaningful counters for unimported source
files in the verified configuration. Aggregate coverage still does not establish
behavioral correctness or replace the risk-based gap analysis.

## Decision 3 — frontend thresholds

On 2026-10-17 the user replaced the initial choice A with **B** before gate
verification completed. Final selected thresholds are **lines 85%, branches
85%, functions 80%, statements 85%**, enforced independently with Istanbul.
The interrupted run using A is not evidence for B.

Rationale: these are regression floors close to the measured risk-package
baseline, with headroom of 2.03 percentage points for lines, 1.66 for branches,
1.69 for functions and 2.46 for statements. The lower function floor reflects
its different measured baseline, not an exclusion of callbacks or UI code.
Compared with the alternative 80/80/75/80, this policy detects smaller drops
and can block new uncovered source sooner. The user explicitly selected that
trade-off. Floors do not certify every security or contract scenario; existing
owner-specific follow-ups remain necessary.

Production scope and test assertions remain unchanged. All executable source
continues to participate, including files not imported by tests. No additional
tests are required to reach these selected floors.

### Frontend gate verification

Using Node 24.15.0 / bundled npm 11.12.1 on the starting SHA plus the documented
working-copy configuration changes:

| Run | Tests | Expected / actual process exit | Coverage outcome |
| --- | --- | --- | --- |
| Normal `npm run test:coverage` with selected B | 509 pass / 48 suites | 0 / 0 | 87.03 lines, 86.66 branches, 81.69 functions, 87.46 statements pass 85/85/80/85 |
| Same script plus `--coverage.thresholds.lines=100` | 509 pass | 1 / 1 | Only lines gate fails at 87.03% |
| Same script plus `--coverage.thresholds.branches=100` | 509 pass | 1 / 1 | Only branches gate fails at 86.66% |
| Same script plus `--coverage.thresholds.functions=100` | 509 pass | 1 / 1 | Only functions gate fails at 81.69% |
| Same script plus `--coverage.thresholds.statements=100` | 509 pass | 1 / 1 | Only statements gate fails at 87.46% |

The four CLI overrides test independent gate wiring; they do not change the
selected policy or any tracked configuration. An additional reduced-test run
tests insufficient coverage against the selected B values without overrides:

```text
npm run test:coverage -- --exclude=src/features/sign-in/__tests__/authPages.test.tsx --coverage.reportsDirectory=../backend/target/pwdrz118-fe-B-reduced-coverage
```

All 502 selected tests / 47 suites pass, but the process exits 1 because all four
final gates reject the lower coverage: lines 744/895 = 83.12%; branches
581/705 = 82.41%; functions 282/355 = 79.43%; statements 83.98%.
LCOV confirms the same line/branch/function denominators as the full run:
895/705/355. This removes tests only for a controlled invocation, not production
source from measurement. No test file is deleted or changed and no exclusion is
added to configuration. The normal coverage report is retained separately.
Reduced-run log: `backend/target/pwdrz118-fe-B-reduced.log`.

Logs are ignored under `backend/target/pwdrz118-fe-B-pass.log` and
`backend/target/pwdrz118-fe-B-fail-{lines,branches,functions,statements}.log`.
Frontend format:check and repository diff whitespace checks also pass.

## Decision 4 — mandatory gateway metrics

The user selected **A: all four gateway metrics are mandatory**: lines,
branches, functions and statements. Each has an independent gate. None of
these four is diagnostic-only. Jest's current `coverageThreshold.global`
already contains all four numeric entries, verified by loading its actual
configuration; no configuration change is needed for this metric decision.
The existing 65% values remain interim until the separate numeric choice.

Rationale: the small gateway contains authentication, proxy and error-handling
functions and branches. Retaining all four existing checks avoids losing a
function-specific regression signal, despite overlap between lines and
statements. The last verified 51-test result is 129/133 lines (96.99%),
40/46 branches (86.95%), 24/26 functions (92.30%) and 131/135 statements
(97.03%). This decision does not claim a new test run or a changed baseline.

## Decision 5 — gateway thresholds

The user selected **A: lines 95%, branches 85%, functions 90%, statements
95%**. These independent global floors replace the interim 65% entries in
`gateway/jest.config.js`; source scope, test suites and Jest provider stay
unchanged.

Rationale: relative to the verified 96.99/86.95/92.30/97.03 baseline, the floors
allow approximately 1.99/1.95/2.30/2.03 percentage points of headroom. This is
a small-service regression policy, not a claim of complete auth/proxy security.
It deliberately offers less room for uncovered new code than the alternative
90/80/85/90. Separate thresholds reflect the actual branch/function baselines
instead of forcing a universal percentage. Previously agreed WS/STOMP follow-ups
remain owned by PWDRZ-104 and the backend test gaps by PWDRZ-156.

Verification: the normal package coverage script with `--runInBand` and a
workspace-local Jest cache passes all 51 tests / 7 suites, exit 0. Metrics are
unchanged: lines 129/133, branches 40/46, functions 24/26, statements 131/135.
The modified Jest configuration passes an explicit Prettier check (the service
format script only checks `src`); gateway lint also passes.

Initial npm-wrapped negative attempt exited with Windows process error
3221226505 without a coverage rejection. It is not gate evidence. Direct Jest
reruns retain the same configuration and produce readable gate failures.
Normal log: `backend/target/pwdrz118-gw-final-pass.log`; failed environment
attempt: `backend/target/pwdrz118-gw-final-fail-lines.log`.

## Decisions still pending

Backend metric policy, backend numeric thresholds and rationale,
any remaining disputed scope/gap choices, and final CI-policy choices must be
confirmed by the user before implementation. Final gate fail/pass verification
and acceptance audit follow those decisions. PWDRZ-118 is not yet complete.
