---
applyTo: "**"
---

# Task Backlog Tracking

- The canonical shared backlog file is [docs/agent-task-backlog/pwdrz-jira-tasks.json](docs/agent-task-backlog/pwdrz-jira-tasks.json).
- Each issue keeps the raw Jira payload and a separate `localTracking` object for agent execution state.
- Valid `localTracking.status` values are `pending`, `in_progress`, `blocked`, and `done`.
- Before starting work, read the backlog file and pick the next task with `localTracking.status = pending` unless the user asked for a specific issue.
- When starting a task, update only `localTracking.status`, `localTracking.updatedAt`, `localTracking.owner`, and `localTracking.notes`.
- Keep Jira fields authoritative; do not overwrite the original Jira payload when changing local status.
- Mark a task `done` only after the requested work is complete and validated.
- Use a short `localTracking.notes` entry to capture the result, blockers, or links to edited files.