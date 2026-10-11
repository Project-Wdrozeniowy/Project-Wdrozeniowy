# Developer guides

This is the entry point for **human-facing** engineering guidance. Read it
before your first PR. The [root README](../../README.md) covers setup and
running Orbita; [docs/README.md](../README.md) maps every documentation
category. These guides record team decisions and target conventions. They do
not claim that all existing code already follows them.

## What to read

| Situation | Read |
| --- | --- |
| Every contributor, before a first PR | This page, [architecture and extension guide](architecture.md), [Git workflow](git-workflow.md), and [testing](testing.md) |
| Adding a backend domain, frontend feature, gateway middleware, or API operation | [Architecture and extension guide](architecture.md), then [naming conventions](naming-conventions.md) |
| Naming a file, type, function, table, or export | [Naming conventions](naming-conventions.md) |
| Creating a branch, commit, or PR; resolving review feedback | [Git workflow](git-workflow.md), [PR guide](pr-guidelines.md), and the short [PR template](../../.github/pull_request_template.md) |
| Adding tests or assessing completion | [Testing guide](testing.md) and the Definition of Done below |
| Running or debugging one service | The [frontend](../../frontend/README.md) or [gateway](../../gateway/README.md) README, plus the [root setup](../../README.md) |

The [codebase maps](../codebase/) are dated technical snapshots for agents and
investigation, **not** the primary source of developer rules. The [agent entry
point](../../AGENTS.md) and [Copilot instructions](../../.github/copilot-instructions.md)
serve tooling; they should point to these guides instead of defining competing
policies. Source code and configuration establish current behaviour; the
guides establish approved future practice. A gap between them is tracked as
work, not silently resolved by rewriting the convention.

## Definition of Done

The relevant implementation owner supplies evidence for their service. The
integration owner verifies affected boundaries; one person's local tests do
not prove a multi-service path.

- **Local frontend or gateway change:** the intended behaviour is verified at
  a useful boundary; affected typecheck, lint, formatting, tests, coverage
  gate, and production build pass. New UI behaviour requires browser-level
  E2E evidence. PWDRZ-117 must establish its automated CI gate; until then,
  record reproducible browser verification and do not claim that the missing
  gate passed. Current React Testing Library tests remain useful but do not
  substitute for browser verification.
- **Local backend change:** relevant Java tests and `./mvnw verify` pass;
  controller, service, security, or persistence behaviour is checked at the
  boundary changed. A schema or enum mapping change has a Flyway-backed
  round-trip test.
- **Cross-service change:** every affected service passes its own checks, the
  frontend and backend agree on the implemented HTTP contract, and there is
  reproducible integration evidence across the changed boundary. When the
  user-visible path changes, include browser-level proof as well.
- **Docs or configuration change:** update affected links and instructions,
  verify commands against configuration, and do not commit secrets or generated
  reports as hand-written documentation.

The existing coverage gates remain mandatory but are **not proof of sufficient
behavioural coverage**. [PWDRZ-118](https://project-wdrz.atlassian.net/browse/PWDRZ-118)
will measure and select meaningful service-specific thresholds and exclusions.
[PWDRZ-117](https://project-wdrz.atlassian.net/browse/PWDRZ-117) owns the
mandatory E2E/CI gate; it does not exist yet, so do not describe an unrun
browser scenario or a non-existent workflow as passed. This is a current
completion gap, not permission to claim E2E completion from unit coverage.

When a task previously treated as implemented reveals additional work, track
the residual in a separate owner-specific Jira task rather than rewriting its
implementation history.

## Language and maintenance

Code identifiers, test names, branch names, commit subjects, and PR metadata
use English. Developer guides may be written in English or Polish. Russian is
also permitted during initial development so contributors can understand the
decisions accurately.

**TODO:** Before external hand-off, normalize any Russian-language developer
guides into an agreed English or Polish version and check that links and
technical terms remain correct. Do not translate code identifiers or API
names. Update the relevant guide when a team decision changes; keep factual
snapshots descriptive and regenerate them only from verified evidence.
