# PWDRZ-126 — root orchestration execution

Starting develop: `319b4802109282e97f0f8ab79c2ec44dbd998927`.
The current checkout is on PWDRZ-137 at the same SHA; that branch name does not
extend the authorized scope. No commits, pushes or GitHub ruleset edits are authorized.

## Accepted decisions

- Nx orchestrates frontend, gateway, backend and E2E; npm workspaces share one
  root lockfile. Application dependencies remain declared by their consumers.
- Common tooling (Nx and Prettier) lives at the root. Existing incompatible
  TypeScript/ESLint majors stay service-owned.
- Development: frontend/gateway from source; PostgreSQL/Redis/backend via Compose.
- Backend verification: local Java 17/Maven wrapper with an owned temporary
  PostgreSQL container. Existing CI PostgreSQL may be selected explicitly.
- Existing separate CI jobs call Nx, preserving their check names and gates.
- Production frontend builds require an explicit NEXT_PUBLIC_API_URL.
- Deterministic build/static tasks may cache; coverage, DB/E2E and lifecycle
  tasks run afresh. No Nx Cloud or affected-only CI rollout.

## Context map (reviewed before implementation)

| Files                                                                   | Purpose / required change                                                                                       |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| root package.json/package-lock.json/nx.json, service project.json       | Workspace discovery, commands, task graph, inputs/outputs and cache policy                                      |
| frontend/gateway/e2e package manifests and old locks                    | Preserve dependency owners; consolidate installation; common Prettier at root                                   |
| tools/workspace/, tools/project.json                                    | Cross-platform process handling, owned test DB lifecycle, dev readiness and build preflight; Nx owns scheduling |
| gateway/Dockerfile, docker-compose.yml, .dockerignore                   | Workspace-aware service image without secrets or unrelated application source                                   |
| e2e/scripts/, e2e/compose.yml                                           | Preserve isolated real-stack semantics with root-lockfile snapshots and hoisted tool resolution                 |
| .github/workflows/                                                      | Install from root and invoke scoped Nx targets; preserve service gates/check names                              |
| README.md, docs/guides/monorepo.md, service READMEs, agent instructions | Commands, ownership, prerequisites, cache/env policy and direct-command escape paths                            |

Dependencies: Node 24/npm 11, Java 17, Maven wrapper, Docker/Compose; existing
service scripts, service coverage configurations, PWDRZ-117 managed E2E launcher.
Meaningful tests: workspace lifecycle/configuration tests, existing E2E
infrastructure tests, all service quality/build/coverage gates, positive and
negative real browser runs. API changes and DB migrations are not needed.

## Implementation

- Five Nx projects: frontend, gateway, backend, E2E and workspace tooling.
  npm workspaces cover the three Node packages, not Java. One root lock replaces
  the three service locks; runtime dependencies remain declared by their consumers.
- Existing direct service commands remain available. Nx schedules their checks;
  backend still calls the Maven wrapper. No application/business logic, Java
  source, database migrations or service coverage thresholds were changed.
- Gateway images and the isolated E2E snapshot install selected workspaces from
  the root lock. Next.js uses the workspace root for Turbopack resolution.
- Six existing workflow files now call scoped Nx targets. Existing job IDs and
  display names were preserved; a separate workspace-tooling job was added.
- Local build/static caching has explicit inputs/outputs. Coverage, DB/browser
  tests, dev and infrastructure tests run afresh. No remote cache, Nx Cloud,
  affected-only CI or GitHub ruleset mutation was introduced.

### Bounded integration fixes found during verification

- Gateway Jest now searches `src/` only. After a root build, its old default also
  executed emitted `dist/**/__tests__/*.js`, duplicating source tests and failing
  on compiled fixtures. The source suite remains 51 tests; coverage gates are unchanged.
- Frontend build explicitly uses production NODE_ENV. Nx's inherited development
  environment otherwise caused a Next.js prerender failure.
- The npm launcher preserves the originating npm CLI rather than accidentally
  selecting an incompatible global npm from PATH. Node 24/npm 11 remain required.
- Dev targets are not marked continuous: in the tested Nx version that setting
  hid a preflight failure as a successful task. Actual root preflight failure now
  exits nonzero. Exported environment overrides follow service `.env` precedence.
- Workspace analytics are disabled to avoid a first-run interactive prompt.

## Verification evidence

Local host: Windows, Node 24.15.0, npm 11, Java 17.0.19, Docker Linux Engine
29.4.3 / Compose 5.1.3. Commands used NX_DAEMON=false and NX_TUI=false.
Raw logs, caches, runtime snapshots and generated reports remain ignored.

| Check                              | Observed result / evidence                                                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run bootstrap`                | Passed: locked root install, Java 17 and Compose checks; `.workspace-artifacts/bootstrap.log`                                                                                                                           |
| `npm run build`                    | All three service builds and prerequisite typechecks passed; `.workspace-artifacts/build-first.log`                                                                                                                     |
| Repeated root build                | Five of five tasks served from local cache; `.workspace-artifacts/build-cached.log`                                                                                                                                     |
| `npm run check`                    | Nine of nine lint/typecheck/format tasks passed; `.workspace-artifacts/check-final.log`                                                                                                                                 |
| Unified validation                 | Final 20-task graph passed in 2m 9s, nine safe cache hits; `.workspace-artifacts/validate-final.log`                                                                                                                    |
| Frontend coverage                  | 509 tests / 48 files passed with unchanged four-metric gates                                                                                                                                                            |
| Gateway coverage                   | 51 tests / seven suites passed with unchanged four-metric gates                                                                                                                                                         |
| Backend verify                     | 187 tests, no failures/errors/skips; JaCoCo gates passed against owned temporary PostgreSQL                                                                                                                             |
| Workspace/E2E infrastructure tests | Seven workspace tests and three existing E2E infrastructure tests                                                                                                                                                       |
| Positive real-stack E2E            | Five cases passed, launcher exit 0 and cleanup; final run `e2e/artifacts/1792274422603-753c764c/`                                                                                                                       |
| Negative browser probe             | Real missing-heading assertion failed, exit 1 propagated through Nx; screenshot/trace retained and stack cleanup ran; `e2e/artifacts/1792274173559-ab3b6502/`                                                           |
| Frontend invalid API URL probe     | Nonzero frontend:build failure, not a stale successful cache hit; `.workspace-artifacts/frontend-failure-probe.log`                                                                                                     |
| Backend failure probe              | Invalid process-local JAVA_HOME rejected by Maven, backend:coverage failed, owned test DB removed; `.workspace-artifacts/backend-failure-probe.log`                                                                     |
| Root dev                           | Isolated Compose project `orbita-dev-check-pwdrz126`: `/login` on 3001 and categories through gateway 3000/backend 8080 all returned HTTP 200. Ctrl+C freed frontend/gateway ports and left Compose alive as documented |
| Dev cleanup                        | Only this test project's containers/network/two empty test-data volumes and its image tag were removed; no developer Compose data touched                                                                               |
| Linux smoke                        | Node 24 container: root-only install, discovery of five projects, infrastructure tests and formatting passed; `.workspace-artifacts/ci-linux-smoke.log`. This is not published GitHub CI evidence                       |
| Dependency preservation            | All 59 retained direct service dependency versions match their old locks. Prettier alone was deliberately consolidated at root                                                                                          |
| Backlog preservation               | All 99 previous issue entries unchanged; only the fresh PWDRZ-126 payload and its localTracking added                                                                                                                   |
| Documentation                      | 158 affected relative Markdown links resolve; Russian navigation anchor/fenced blocks checked; `git diff --check` passed                                                                                                |

Dev used process-local PORT=3000 and NEXT_PUBLIC_API_URL=http://localhost:3000/api
overrides because existing local configuration differed. No `.env` was rewritten.

## Acceptance criteria assessment

| Jira criterion                                                                        | Assessment                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Selected tool and root manifests committed with rationale                             | Nx choice/configuration and rationale prepared and tested locally; **commit intentionally pending explicit user authorization**                                                                  |
| Discoverable root command for common workflows, independent service commands          | Implemented in root manifest, root README and [developer guide](../guides/monorepo.md); bootstrap/dev/build/check/test/E2E/validate exercised as described above                                 |
| Correct validation dependencies and identifiable failing service                      | Graph prerequisites verified; successful unified run and frontend/backend/browser negative probes demonstrate failure propagation                                                                |
| CI uses orchestration without weakening gates                                         | Six workflow files updated, previous job identities and service thresholds retained; **published GitHub execution remains unverified**                                                           |
| Reproducibility on CI Node/Java, no generated artefacts/credentials/reports committed | Locked local install/build/tests passed on matching major versions; supplemental Linux smoke passed. Generated output is ignored; no commit performed. Full hosted CI remains a publication step |
| Ownership boundaries and direct-command escape path documented                        | [Monorepo guide](../guides/monorepo.md) and service READMEs cover boundaries and commands; Java remains Maven-owned                                                                              |

Do not mark the entire Jira issue complete on local evidence alone: committed
configuration and successful published checks require explicit publication work.
No Jira status, GitHub required check, commit, push or PR was changed/created.

## Targeted provisional-functionality check

Checked exact PWDRZ-126 references and adjacent scripts/configuration, including
hidden agent/CI instructions, for expired markers and dependency wording.
No current-ticket provisional application mechanism required enabling/removal.
PWDRZ-137 still owns affected/selective CI and GitHub required-check administration;
local orchestration does not prove those external changes ready or complete.
Stale generated codebase maps remain outside this implementation under the existing
documentation/reference work (PWDRZ-125); they were not silently regenerated.
No unrelated feature flags, stubs, Redis/Socket.IO plans or Java features were changed.
