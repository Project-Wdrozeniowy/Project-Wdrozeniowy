# Documentation

Start with the repository [README](../README.md) to run Orbita. This page is
the map for everything beyond first-time setup. Documentation describes the
repository; source code, configuration, tests, and Flyway migrations remain
authoritative for actual behaviour.

## What should I read?

| Reader or task | Start here | Then, if relevant |
| --- | --- | --- |
| New developer | [Root README](../README.md), then [developer guides](guides/README.md) | [Architecture and extension guide](guides/architecture.md), then the [frontend](../frontend/README.md) or [gateway](../gateway/README.md) README for your service |
| Preparing a PR | [Developer guides and Definition of Done](guides/README.md#definition-of-done) | [Git workflow](guides/git-workflow.md), [PR guide](guides/pr-guidelines.md), [testing guide](guides/testing.md), and the [PR template](../.github/pull_request_template.md) |
| Investigating architecture or a feature boundary | [Human-facing architecture guide](guides/architecture.md) | [Current-state capability map](codebase/ARCHITECTURE.md), [structure map](codebase/STRUCTURE.md), and the service source code |
| Investigating the database | [Flyway migrations](../backend/src/main/resources/db/migration/) | [ER diagrams](#database-diagrams) for visual orientation |
| AI agent or tooling maintainer | [AGENTS.md](../AGENTS.md) | [Machine-oriented files](#ai-agents-and-tooling) below |

## Guides: team rules

[`guides/README.md`](guides/README.md) is the entry point for rules developers
are expected to follow. Its focused companions are the
[architecture and extension guide](guides/architecture.md),
[naming conventions](guides/naming-conventions.md),
[Git workflow](guides/git-workflow.md), [PR guide](guides/pr-guidelines.md),
and [testing](guides/testing.md). These are contribution guidance, not
automatically generated code maps. A guide may describe a target rule that
has not yet been applied to old code; the codebase maps describe what exists.

## Codebase: current-state reference

`codebase/` is a dated, evidence-backed snapshot produced in the fixed layout
expected by the repository's `acquire-codebase-knowledge` skill. Read the
part you need; none of these files is a mandatory onboarding sequence.

| Document | Use it for |
| --- | --- |
| [ARCHITECTURE.md](codebase/ARCHITECTURE.md) | Request flow, responsibilities, implemented/mock/stub/deferred capability status |
| [STRUCTURE.md](codebase/STRUCTURE.md) | Directories, entry points, route and package layout |
| [STACK.md](codebase/STACK.md) | Runtimes, dependencies, environment and build tools |
| [INTEGRATIONS.md](codebase/INTEGRATIONS.md) | Database, gateway, WebSocket and external-integration boundaries |
| [TESTING.md](codebase/TESTING.md) | Observed test layout, coverage configuration and gaps |
| [CONVENTIONS.md](codebase/CONVENTIONS.md) | Formatting, naming, and imports observed in the repository; for approved rules use the guides |
| [CONCERNS.md](codebase/CONCERNS.md) | Known risks and technical debt at the snapshot date |

The hidden [`.codebase-scan.txt`](codebase/.codebase-scan.txt) is a generated
diagnostic input for these maps, not a complete directory inventory or a
developer guide. Its tree is capped at 200 entries. Do not update the seven
snapshot files by copying old assertions forward without checking the code.

## Database diagrams

[`db-schema.mmd`](db-schema.mmd) is the full Mermaid ER view. The
[auth](db-schema-auth.mmd), [forum](db-schema-forum.mmd), and
[social](db-schema-social.mmd) files are smaller views of the same schema.
Their same-named PNGs are rendered viewing copies. Keep each `.mmd`/`.png`
pair together; no automated diagram-generation path is configured in this
repository. The [Flyway migrations](../backend/src/main/resources/db/migration/),
not the diagrams, define the actual database schema.

## AI agents and tooling

These files are instructions or machine context, not extra developer guides:

| Path | Consumer and purpose |
| --- | --- |
| [AGENTS.md](../AGENTS.md) and [CLAUDE.md](../CLAUDE.md) | Root agent discovery and Claude's pointer to the agent instructions |
| [Copilot instructions](../.github/copilot-instructions.md), [scoped instructions](../.github/instructions/), [agent definitions](../.github/agents/) | GitHub Copilot behaviour; paths and filenames are integration points |
| [`.agents/`](../.agents/) and [`.claude/`](../.claude/) | Skill packages and tool-specific instructions; keep their expected layouts |
| [Jira backlog export](agent-task-backlog/pwdrz-jira-tasks.json) | Agent execution state; historical Jira payload is not proof that code exists |
| [PR template](../.github/pull_request_template.md) and [CI workflows](../.github/workflows/) | GitHub contribution form and executable quality gates |

The [LICENSE](../LICENSE) contains the proprietary terms; the
[NOTICE](../NOTICE.md) records copyright holders and project context. Neither
is a development convention.

## Sources of truth

| Question | Check first |
| --- | --- |
| What does the application do now? | Source code and tests; use the codebase maps to find them |
| What is the database schema? | Immutable Flyway migrations |
| Which HTTP operations can a client use? | [`backend/openapi.json`](../backend/openapi.json), generated from the backend and kept current by `OpenApiContractTest` |
| Which checks run? | Package/Maven configuration and `.github/workflows/` |
| What are the team contribution rules? | [Developer guides](guides/README.md); GitHub rulesets determine technical enforcement, which must be checked separately |
| What work is planned or complete? | Live Jira; treat the local backlog export and dated snapshots as context |
