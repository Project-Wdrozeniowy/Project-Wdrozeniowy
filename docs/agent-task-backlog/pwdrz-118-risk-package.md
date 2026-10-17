# PWDRZ-118 — risk package execution record

> Historical execution record from 2026-10-16. The user accepted Istanbul on
> 2026-10-17; see [final decisions](pwdrz-118-final-decisions.md) for subsequent
> implementation, metric/threshold choices and verification.

Reference SHA: `cc998e7ec9f627be613f902638b96cc780d4f40e`; 2026-10-16.
Threshold selection remains pending. This document records implementation and provider experiments following the user's decisions.

## Context map (reviewed before implementation)

| Files | Purpose / intended change |
| --- | --- |
| `gateway/src/middleware/authGuard.ts` | Remove unused cookie-based page redirect alternative; active API JWT middleware stays in `auth.ts` |
| `frontend/vitest.config.ts`, `frontend/package*.json` | Reference configuration and locked versions for an isolated V8/Istanbul comparison; no permanent provider/threshold choice during experiment |
| `frontend/src/shared/api/*`, related DTOs and tests | Identify adapters for implemented versus planned backend contracts; mark planned fixtures and tests explicitly provisional |
| `frontend/src/app/(auth)/*`, `features/sign-in`, `features/sign-up`, `shared/api/auth` | Auth risk tests and explicitly tracked contract gaps |
| `gateway/src/routes/wsProxy.ts`, `middleware/rateLimiter.ts`, related tests | Transport failure and rate-limit response coverage |
| `backend/src/main/java/com/devpulse/config/{SecurityConfig,WebSocketConfig}.java`, `websocket/**`, `forum/*/PostSubscription*` | Verify REST subscription versus STOMP implementation; record auth-only interim policy and backend-owned test work |
| `backend/openapi.json`, backend controllers/DTOs, `docs/codebase/ARCHITECTURE.md` | Authoritative implemented contract and documented stub status |

Dependencies: Next.js pages run independently from the Express API gateway; backend owns refresh-token persistence/rotation and private resource authorization; frontend keeps memory token and session/UI state. Existing AuthProvider/AuthGuard/RoleGuard/API refresh tests are references, not candidates for wholesale replacement.

Risk assessment: no DB migration or public API redesign planned. No automatic move to a BFF/session architecture. Any provisional adapter tests must not certify a planned response as a live backend contract. Provider runs precede production/test edits so their input trees are identical.

## Architecture findings

The gateway mounts health, `/api` middleware/proxy and `/ws` proxy; it does not serve Next.js routes. `authGuard.ts` has no imports, depends on an `orbita_session` cookie not issued by the current authentication flow and reads `req.cookies` without a corresponding cookie parser. It cannot replace frontend initialization/visibility guards or backend authorization. Delete this unused alternative rather than exclude it from coverage or wire it into the current request flow. A migration task is not justified by the current architecture; a BFF/SSR redesign would be a separate architectural initiative with an independent requirement.

REST post subscriptions are implemented: authenticated PUT/DELETE `/api/forum/posts/{slug}/subscription` and GET `/api/users/me/subscriptions`, service/repository, Flyway-backed API/concurrency tests and notification-recipient eligibility. STOMP infrastructure exists (broker, interceptor, gateway proxy), but its subscribe/unsubscribe methods are TODOs; no producer/client delivery flow is wired. PWDRZ-104 already owns real-time architecture, authentication, recipient isolation, reconnect and logout. Interim decision: real-time messages/subscriptions require authentication; this records the intended policy, not a claim that the end-to-end security path is complete. The REST subscription feature is distinct and already has its own authentication checks.

## Contract ownership findings

Backend source/OpenAPI defines implemented operations. Existing `@Hidden`/501 controllers and documented delivery tasks are explicit provisional mechanisms for comments, category writes, tags, notifications, analytics, recommendations and AI. Their frontend adapters and mocked success fixtures can remain as planned adapter/UI behavior, provided source/tests identify the dependency and never claim live contract compatibility. Existing feature tasks must be reused.

Registration displayName already exists in backend RegisterRequest/OpenAPI; FE omission is covered by PWDRZ-128, dependent on PWDRZ-95. No duplicate ticket is needed. Interests has no backend request field or implemented persistence contract and the registration UI currently presents it without a provisional marker; this requires a focused FE follow-up. Profile-load failure after a received token leaves tokenMemory populated while UI stays guest; this is a separate reproducible FE auth consistency defect, with PWDRZ-150 as related state ownership work.

## Implemented in the working copy

* Removed unused gateway authGuard and documented the boundary in AGENTS.md, reusing existing PWDRZ-99. No migration ticket was created because the current API-only gateway is not a replacement for Next.js session initialization/visibility guards. The file was measured until its deletion; no coverage exclusion was restored.
* Added a deterministic rate-limit integration test for two allowed requests and then the real custom 429 response/headers. Added raw HTTP sendError response coverage.
* Added a real WS/SockJS HTTP proxy outage regression. It first returned 404 instead of the expected 502 and exposed the invalid mixed string/glob filter. PWDRZ-157 tracks this concrete bug. A function matching exactly /ws or /ws/ descendants fixes it; the regression now checks /ws, /ws/info and exclusion of /ws-other. This does not demonstrate a complete WebSocket handshake, STOMP authorization or backend context-path routing.
* Fixed PWDRZ-155 locally: failed profile fetch clears its own pending memory token and rethrows the original error, without clearing a newer token installed while the request was pending. Success, cleanup and superseding-session tests protect the behavior.
* Added auth-page component tests for invalid login, login success/profile/store/navigation, credential failure, pending submission, profile failure, registration success and registration error. Schemas have focused local confirm-password/terms/email checks. Tests do not assert omission of displayName/interests as a final contract.
* Reconciled existing provisional tests: explicit task references on comments, AI, analytics, recommendations, notifications and category-write/tag fixtures; existing planned success fixtures remain local adapter/UI examples. The comments error test now covers both 500 and the actual backend 501 stub and does not turn it into an empty/success result. Source annotations distinguish planned adapters from implemented OpenAPI.
* Added TODO(PWDRZ-154) on unsupported interests UI, TODO(PWDRZ-128) at displayName omission and remaining registration validation mismatch. The user-visible interests treatment and backend parity remain FE-owned task acceptance work, not a claim that a TODO implements persistence.

## Jira triage and ownership

Live searches used semantic and JQL queries across authentication/registration/interests, profile failure/token, coverage, WebSocket/subscriptions and contracts. Existing PWDRZ-95/128/131/150/104/109/67 and newer PWDRZ-130–153 were read for scope and writing references; assignability was verified before creation.

| Issue | Ownership / outcome |
| --- | --- |
| [PWDRZ-99](https://project-wdrz.atlassian.net/browse/PWDRZ-99) | Reused for deletion of the unused gateway guard; local work completed, Jira status unchanged |
| [PWDRZ-128](https://project-wdrz.atlassian.net/browse/PWDRZ-128) | Existing FE displayName/registration alignment; no duplicate |
| [PWDRZ-104](https://project-wdrz.atlassian.net/browse/PWDRZ-104) | Existing real-time design/delivery/authentication; interim authenticated-only decision recorded here |
| [PWDRZ-154](https://project-wdrz.atlassian.net/browse/PWDRZ-154) | New bug: unsupported registration interests, Dzmitry Varonin; TODO added, final UI handling pending |
| [PWDRZ-155](https://project-wdrz.atlassian.net/browse/PWDRZ-155) | New bug: pending token survives profile failure, Dzmitry Varonin; local fix/tests ready for review |
| [PWDRZ-156](https://project-wdrz.atlassian.net/browse/PWDRZ-156) | New task: backend auth/conflict/error gaps, Ivan 82288; Java additions remain backend-owned and unimplemented here |
| [PWDRZ-157](https://project-wdrz.atlassian.net/browse/PWDRZ-157) | New bug: mixed WS path filter, Ruslan 82179; local fix and real-proxy regression pass |

Creation/assignment of PWDRZ-154–156 was read back from Jira. PWDRZ-157 creation returned its assignee and scope. New issues are To Do; none is declared merged or completed in Jira. Local backlog records keep existing Jira payloads intact and append five current snapshots (PWDRZ-118,154–157); historical import metadata still describes the original 93-record import. LocalTracking records draft implementation progress independently of Jira status.

## Provider comparison and verification

See [provider comparison](pwdrz-118-provider-comparison.md) for all file counters and the recommendation to use Istanbul lines/branches, with functions/statements as diagnostics. The original comparison used the same 496 existing tests before any frontend implementation changes. No final provider or threshold switch was applied.

Final checks: frontend 48 suites / 509 tests pass with the current V8 provider and separately with Istanbul; frontend typecheck/lint/format pass. V8 post-risk metrics: 2933/3634 lines/statements = 80.70%, 767/841 branches = 91.20%, 234/267 functions = 87.64%. Istanbul post-risk metrics: 779/895 lines = 87.03%, 611/705 branches = 86.66%, 290/355 functions = 81.69%.

Gateway 7 suites / 51 tests pass: 129/133 lines = 96.99%, 131/135 statements = 97.03%, 40/46 branches = 86.95%, 24/26 functions = 92.30%; typecheck/lint/format pass. Compared with the original active scope (120/132 lines, 35/44 branches), new tests/fix add 9 covered lines and 5 covered branches while adding 1 line and 2 branches. Removing the unused guard separately removed 17 lines and 10 branches; that scope change must not be presented as new test coverage.

Gateway initially hit sandbox temp-cache EPERM and loopback EACCES before the successful run. The successful command used `npm.cmd run test:coverage -- --cacheDirectory=../backend/target/jest-cache-risk` with local-network permission. These failed environment attempts are not baselines. Gateway logs: `gateway/coverage/pwdrz118-risk.log`; FE logs: `backend/target/pwdrz118-risk-frontend.log` and `backend/target/pwdrz118-risk-istanbul.log`.

Backend production/test sources were not changed in this risk package. The last verified clean baseline remains 187 tests, 872/905 lines and 299/347 branches. No newer Java test results or improved backend coverage are claimed. The pending backend work is PWDRZ-156, coordinated with PWDRZ-104.

## Remaining scope

The completed local risk subset is ready for review. Backend tests, final STOMP implementation, user-visible interests handling and PWDRZ-128 registration parity remain explicitly owned follow-ups. PWDRZ-118 still needs the final provider/configuration decision, justified service thresholds and deliberate gate fail/pass verification. No numeric threshold was selected or weakened; commits/push/PR were not requested and were not performed.
