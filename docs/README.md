# Documentation map

This directory contains documentation that supplements the repository-level [README](../README.md).

## Reading order

1. Start with the root README for prerequisites, local startup, and the common quality commands.
2. Read [guides/conventions-index.md](guides/conventions-index.md) before opening a pull request.
3. Use [codebase/](codebase/) as an evidence-backed snapshot of the current repository state. Source code, migrations, runtime configuration, CI workflows, and GitHub rulesets take precedence if they differ from a snapshot.
4. Use the Mermaid ER diagrams (`db-schema*.mmd`) as the editable database diagrams. Their PNG counterparts are generated viewing artefacts.

## Sources of truth

| Topic | Authoritative source |
| --- | --- |
| Runtime behaviour and API availability | Source code, tests, and `backend/src/main/resources/application.properties` |
| Database schema | Immutable Flyway migrations in `backend/src/main/resources/db/migration/` |
| Quality gates | Package/Maven configuration and `.github/workflows/` |
| Branch protection and merge restrictions | GitHub repository rulesets |
| Team contribution conventions | `docs/guides/` and `AGENTS.md` |

Do not treat generated reports, screenshots, or historical Jira exports as implementation evidence.

## Evidence

- [README.md](../README.md)
- [docs/guides/conventions-index.md](guides/conventions-index.md)
- [backend/src/main/resources/db/migration/](../backend/src/main/resources/db/migration/)
- [.github/workflows/](../.github/workflows/)
