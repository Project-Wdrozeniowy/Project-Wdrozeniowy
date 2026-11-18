# PWDRZ-160: adopted SPA and historical experiment

Audience: contributors and reviewers. Maintenance owner: platform/integration owner.

The Vite/React Router SPA was adopted in develop in 4c8f082 (PR #78,
7 November 2026). PWDRZ-99 subsequently replaced REST JWT/refresh with Spring
JDBC sessions and CSRF in 20239ca (PR #79).

## Run the current checkout

Start at the [root README](../../../README.md#getting-started) for setup and
current dev/Compose start/stop commands. Use the [workspace guide](../../guides/monorepo.md)
for tasks/cache, [frontend architecture](../../guides/frontend/README.md) for
routes and [session policy](../../guides/sessions.md) for authentication.

Development: Vite :3001 proxies relative /api through Express :3000 to Spring
:8080. Gateway dev is API-only. Built topology: Express serves HTML/assets and
/api on :3000; no separate frontend process. Spring owns sessions, CSRF and
resource authorization. Gateway has no REST JWT verifier. JWT_SECRET remains
backend-only provisional WS compatibility (PWDRZ-104).

## Historical reproduction

The [original runbook](historical-runbook.md) applies ONLY to its pinned Next
baseline and experimental revisions, not the current checkout. Its non-adoption,
publication and token-lifecycle statements describe that historical stage.
Check out the specified revision and use isolated resources before reproducing it.

- [Original results and comparison](results.md)
- [Route-structure record](route-structure.md)
- [Branch review](review.md)
- [Original verification](verification.json)
- [Documentation rework evidence](../../agent-task-backlog/pwdrz-160-execution.md)

Measurements, SHAs, screenshots and unrun-check limitations are retained. They
are not new acceptance for current source. PWDRZ-74 owns the separate user/release
handoff; this correction does not complete that task.
