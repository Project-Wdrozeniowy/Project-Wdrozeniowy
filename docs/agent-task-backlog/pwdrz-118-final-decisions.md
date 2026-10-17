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

### Gateway controlled failures

Direct command base, from `gateway/`:

```text
node node_modules/jest/bin/jest.js --coverage --runInBand --cacheDirectory=../backend/target/jest-cache-risk
```

For each metric, pass `--coverageThreshold=<JSON>` containing all four selected
global thresholds with only that metric raised to 100. All four runs pass
51 tests / 7 suites, exit 1, and explicitly report only the intended metric's
coverage violation: lines 96.99%, branches 86.95%, functions 92.30%, statements
97.03%. CLI overrides do not modify tracked policy.

An additional run adds `--runTestsByPath src/config/__tests__/index.test.ts`
without a threshold override. All 13 selected tests pass, but the final gates
reject lines 16/133 = 12.03%, branches 4/46 = 8.69%, functions 6/26 = 23.07%,
statements 11.85%; exit 1. LCOV confirms unchanged production denominators
133 lines / 46 branches / 26 functions. This verifies insufficient coverage
against the actual selected thresholds, without changing tests or coverage scope.

Each negative run uses a separate `--coverageDirectory` under `backend/target/`
to preserve the normal `gateway/coverage/` report. Exact argument arrays, exits
and gate messages are saved in ignored
`backend/target/pwdrz118-gw-verified-results.json`; per-run logs are
`backend/target/pwdrz118-gw-verified-{lines,branches,functions,statements,reduced}.log`.
These are local checks; no new GitHub CI result is claimed.

## Frontend/gateway CI and documentation alignment

The user requested this alignment before proceeding to backend. Context map:
`.github/workflows/test.yml` supplies display names and invokes the existing
service scripts; `docs/guides/testing.md` is the canonical coverage policy;
root/service READMEs, developer-guide entry points and agent/review instructions
refer to that policy. `docs/guides/git-workflow.md` lists the updated check names.
Dependencies are the accepted frontend/gateway configurations and package scripts.
Existing pass/fail suites above verify gate behavior; this step changes no test
assertion, API, database schema or coverage scope.

Frontend and gateway display names are now `Frontend Tests (coverage gates)`
and `Gateway Tests (coverage gates)`. Their job IDs, triggers, `npm ci` install
steps and `npm run test:coverage` commands are unchanged; the existing scripts
already enforce the selected configuration. Percentages are not copied into
job labels. Backend workflow/configuration remains untouched in this step.

The canonical guide records thresholds, independent mandatory metrics, provider,
measured paths/exclusions and rationale; English and Russian sections agree.
Current-facing instructions no longer claim broad frontend UI/hook exclusions
or universal 65% frontend/gateway gates. Historical measurement reports retain
their original dated values.

Read-only GitHub inspection found no `required_status_checks` rules in active
rulesets 14868458 (develop), 14868413 (main) and 14868510 (staging).
No remote settings were changed. This checks these rulesets only, not every
possible branch-protection mechanism; enforcement work remains PWDRZ-137.
Renamed jobs still require a new GitHub run after publication; local verification
does not establish remote success. No commit, push or workflow dispatch occurred.

Verification completed: parsed the workflow with the installed `js-yaml` and
compared it structurally with HEAD after normalizing only the two display names.
Everything else is identical, including backend, triggers, job IDs and steps.
Checked actual package scripts, frontend provider/version and all eight
frontend/gateway threshold values against the canonical policy table; checked
the new local policy links and removed stale current-facing frontend/gateway
65%/broad-exclusion claims. Frontend format:check and `git diff --check` pass.
Existing gate pass/fail evidence remains applicable: no runner command or
behavior changed in this documentation/naming step.

Targeted provisional-marker review covered PWDRZ-118 references in the changed
workflow, guides and agent instructions. Resolved future-tense frontend/gateway
policy references now describe the selected implementation. Backend references
remain explicitly pending; PWDRZ-117 and PWDRZ-139 prerequisites have not been
satisfied by this work and their markers are retained. No unrelated temporary
feature was enabled, and no other owner's task is claimed newly unblocked.

## Decision 6 — backend metric policy

The user selected **A: mandatory LINE and BRANCH coverage**. METHOD and
INSTRUCTION remain diagnostic JaCoCo metrics. The gates will use independent
BUNDLE COVEREDRATIO limits, consistent with the existing global LINE rule.

Rationale: LINE measures execution across source code; BRANCH adds a separate
regression signal for conditional outcomes in authorization, business rules
and error paths. METHOD execution alone does not establish coverage of those
outcomes, and INSTRUCTION overlaps source execution while being less directly
readable in behavior reviews. Neither aggregate metric proves assertions are
correct; the backend-owned gaps remain PWDRZ-156, with provisional STOMP
delivery/authentication under PWDRZ-104.

The last clean baseline remains 187 passing tests, LINE 872/905 = 96.35%,
BRANCH 299/347 = 86.17%, METHOD 241/249 = 96.78% and INSTRUCTION
4156/4300 = 96.65%. Inspection confirms the current POM still has only
LINE >= 0.65. No BRANCH limit or new numeric threshold is configured yet:
implementation and controlled verification follow the separate numeric choice.
This documentation-only decision does not claim a new backend test run.

## Decision 7 — backend thresholds and reproducible execution

The user selected **A: LINE >= 95%, BRANCH >= 85%**. Both are independent
`BUNDLE` / `COVEREDRATIO` limits in `backend/pom.xml`; METHOD and INSTRUCTION
remain diagnostic. Relative to the clean 96.35% / 86.17% baseline, headroom is
1.35 / 1.17 percentage points. This deliberately tight regression policy can
block uncovered new Java code sooner than the alternative 90% / 80%; the user
accepted that trade-off. No new Java tests are needed to meet the floors.

Context map for this implementation: `backend/pom.xml` owns agent/check/report;
`.github/workflows/test.yml` invokes `verify`; `docs/guides/testing.md` is the
canonical policy; root README, AGENTS, Copilot and guide entry/check-name lists
must agree. Dependencies are the existing 187 tests, single Surefire test fork,
Flyway and PostgreSQL. No API, source behavior, test assertion or exclusion
change is needed. `git diff 9167dc7 -- backend/src` was empty at verification.

Implementation also sets `prepare-agent` `append=false`, preventing old probes
from accumulating across test runs. This is a technical correction to the
documented reproducibility defect, using the current single fork. Introducing
multiple forks/JVMs requires a separate execution-file/merge design; do not
silently reuse this setting for such a topology. Report/check exclusions remain
identical and unchanged. The workflow now labels backend
`Backend Tests (coverage gates)`; its existing `./mvnw --batch-mode verify`
command, environment, PostgreSQL service, triggers and job ID are unchanged.

### Backend environment and commands

Verification date: 2026-10-17. Repository SHA:
`42d7bcf24470c01eb0b230978f071ef0ec3045b9` plus the documented backend POM,
workflow-label and documentation working-copy changes. Windows 11, Temurin
Java 17.0.19, Maven 3.9.9, JaCoCo 0.8.12, Docker Engine 29.4.3,
PostgreSQL 16.14 (`postgres:16-alpine`).

An ephemeral container `pwdrz118-final-coverage` used no volume and exposed
only `127.0.0.1:55432`; it did not use the developer database. Exported test
environment: `SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:55432/devpulse`,
`SPRING_DATASOURCE_USERNAME=devpulse`,
`SPRING_DATASOURCE_PASSWORD=pwdrz118_test_only`, matching `POSTGRES_DB`,
`POSTGRES_USER`, `POSTGRES_PASSWORD`, and the existing CI test JWT secret.
Database readiness was checked before Maven.

Commands from `backend/`, using the installed wrapper distribution directly
because the previously documented Windows wrapper invocation was unreliable:

```powershell
$mavenExe = 'C:\Users\Ruslan\.m2\wrapper\dists\apache-maven-3.9.9\3477a4f1\bin\mvn.cmd'
& $mavenExe --batch-mode '-Dmaven.repo.local=C:\Users\Ruslan\.m2\repository' verify
& $mavenExe --batch-mode '-Dmaven.repo.local=C:\Users\Ruslan\.m2\repository' -f .pwdrz118-line-fail.pom.xml 'jacoco:check@check'
& $mavenExe --batch-mode '-Dmaven.repo.local=C:\Users\Ruslan\.m2\repository' -f .pwdrz118-branch-fail.pom.xml 'jacoco:check@check'
& $mavenExe --batch-mode '-Dmaven.repo.local=C:\Users\Ruslan\.m2\repository' '-Dtest=JwtUtilTest' verify
& $mavenExe --batch-mode '-Dmaven.repo.local=C:\Users\Ruslan\.m2\repository' verify
```

Temporary POM copies were created next to the original to preserve basedir;
each raised only the named minimum to 1.00 and reused the full clean execution.
They were removed in `finally`. The reduced-test command used the actual
95% / 85% configuration without a threshold override and overwrote prior
execution data, as configured. The final full command restores the normal
report after the deliberate failure.

### Backend verification results

Initial full run: **187 tests pass**, exit 0, both selected coverage gates pass.
JaCoCo reports one session and 59 analyzed executable classes. Counters match
the earlier clean baseline exactly: LINE 872/905, BRANCH 299/347, METHOD
241/249, INSTRUCTION 4156/4300. No tests or exclusions inflated this result.

Independent negative checks each exit 1 with the intended violation only:
LINE covered ratio 0.96 below 1.00; BRANCH covered ratio 0.86 below 1.00.
JaCoCo formats these error ratios to the minimum's precision; exact report
percentages remain 96.35% and 86.17%, not 96.00% and 86.00%.

Reduced run: **13 JwtUtilTest tests pass**, but Maven exits 1 because both
actual final limits reject coverage: LINE 32/905 = 3.54% and BRANCH 5/347 =
1.44%. The report has one session; source denominators remain 905/347.
This proves the selected floors reject insufficient coverage and old full-suite
probes are not retained. Source files, test files and tracked exclusions were
not changed for this experiment.

Final restored full run: **187 tests pass**, exit 0, both gates pass again.
Its XML has exactly one session and the original 872/905 lines, 299/347
branches; the reduced report has one session with the same denominators.
This verifies replacement of prior data both from full to reduced and back.
The temporary POM files are absent; `docker ps -a` confirms the ephemeral
container was removed after its `finally` cleanup.

Ignored evidence: `backend/target/pwdrz118-be-final-pass.log`,
`pwdrz118-be-final-fail-line.log`, `pwdrz118-be-final-fail-branch.log`,
`pwdrz118-be-final-reduced.log`, `pwdrz118-be-final-restored-pass.log`, with full
and reduced `.exec` / XML snapshots under the same target directory. Earlier
default execution/report were backed up as `pwdrz118-pre-final.exec` and
`pwdrz118-pre-final-report.xml`; no historical evidence was cleaned away.

## Current GitHub evidence and remaining completion step

The user published earlier changes independently. Read-only verification now
confirms [Tests run 39042464392](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/actions/runs/39042464392)
is successful at SHA `42d7bcf24470c01eb0b230978f071ef0ec3045b9`:
frontend uses Istanbul and reports 87.03/86.66/81.69/87.46%; gateway passes 51
tests at 96.99/86.95/92.30/97.03%. Their new job names are present.
Build Frontend, Build Gateway, Build Backend and Lint runs at that SHA also
pass. That run's backend still has the old 65% line gate and old label; it
does **not** validate the new backend 95/85 configuration.

Existing PR: [#57](https://github.com/Project-Wdrozeniowy/Project-Wdrozeniowy/pull/57),
target `develop`. Final backend changes must be published and CI verified on
their actual commit before the user-requested final completion claim.
No commit/push/dispatch or Jira status change was authorized or performed here.

## Acceptance audit against live PWDRZ-118

The Jira issue was reopened after implementation/verification on 2026-10-17;
its description/acceptance criteria are unchanged and status is In Progress.

| Acceptance criterion | Actual evidence and status |
| --- | --- |
| Baseline and command for each service, or concrete blocker/rerun | Satisfied: stages 1–2 and 3–4 records plus provider/risk/final records contain commands, SHA, environment and measured counters. All three services were measured; initial environment blockers were resolved, not replaced with assumed numbers. |
| Selected metrics, included paths, exclusions, service thresholds and rationale | Satisfied locally: canonical testing guide and this record match FE 85/85/80/85, GW 95/85/90/95 (lines/branches/functions/statements), BE LINE 95 / BRANCH 85. Report/check scope is identical for BE, executable production logic remains included and METHOD/INSTRUCTION are diagnostic. |
| No assumed universal 65% | Satisfied: all decisions were user-selected from clean service-specific baselines and documented trade-offs; no interim 65% gate remains in final configurations. |
| Threshold enforced by repository config or CI for each supported service | Implemented and verified locally for all three. GitHub run 39042464392 confirms FE/GW at their selected values; publication and a new run are still required to establish remote evidence for final BE gates. |
| Deliberately insufficient coverage rejected and compliant run demonstrated | Satisfied locally for all three: normal pass, isolated per-metric violation, reduced-test failure with unchanged production denominators. Backend full pass was repeated after the reduced run; all commands/exits are recorded above. No remote negative run is claimed. |
| Required Java/Spring additions tracked as backend-owned | Satisfied: no Java additions are needed to meet the selected floors. Behavioral follow-up PWDRZ-156 was reread: To Do, Ivan 82288. It remains backend-owned; real-time implementation is PWDRZ-104, not silently absorbed into 118. |

Additional consistency checks pass: workflow parses and differs from the current
HEAD only by the backend display name; job IDs, triggers, environment and
execution commands are unchanged. POM XML has exactly the selected LINE/BRANCH
limits and `append=false`; report/check exclusions agree. The canonical policy
table and current instructions agree; no temporary test POM remains, and
`git diff --check` passes. No production/test source file changed in this step.

Targeted post-task provisional review covered current ticket/branch references
in backend source/POM, workflow, touched guides and agent instructions. Stale
backend policy/label references were resolved as part of this task. No marker
was found that authorizes enabling unrelated provisional feature code; no other
owner's task was verified newly unblocked. Existing PWDRZ-104/128/154/156 feature
work and PWDRZ-117 E2E / PWDRZ-137 branch enforcement remain outside this gate
implementation. Do not announce final readiness to close until the user-requested
new backend CI evidence exists. The next required action is explicit user
authorization to commit/push these reviewable changes to existing PR #57, or
publication by the user, followed by read-only CI verification on the new SHA.
