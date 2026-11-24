# PWDRZ-104 execution record

Implementation started after the user approved the plan in this chat on 2026-11-24 (Europe/Warsaw).
Branch: `PWDRZ-104-realtime-notifications`. Base HEAD: `157c1b01f2d550ebc7d986720165f26757935f18`.
Local verification below used working-tree source snapshots. The user subsequently authorized logical
commits and publication of this task branch. No remote CI result or Jira transition is claimed here.

## Approved decisions

- One Spring STOMP path behind Express: external `/ws` -> backend `/api/ws`.
- SockJS prefers WebSocket, then XHR streaming/polling. No Socket.IO/Redis consumer or second protocol.
- Reuse SESSION/CSRF, existing comment/reply eligibility/persistence, generated notification REST and UI.
- Publish a minimized versioned invalidation after commit; REST remains authoritative. No durable per-frame
  replay/outbox guarantee. Reconnect reconciles persisted notifications.
- One owner implements BE/Gateway/FE/tests under this issue; no separate coordination approval is imposed.
- Figma reviewed through MCP: Orbita `J2k3T1a2db6v51UckdUyEU`, notification page `197:608`, frames
  `197:609`, `197:1470`, `197:1193`. Preserve the existing screen; no new example producers/category filters.

## Implementation and regression evidence

`WebSocketAuthInterceptorTest.notificationConnectionsMustRejectMissingAuthentication` was added and
observed failing against the legacy interceptor: the expected denial was not raised. It then passed with
SESSION/CSRF security. `notificationStream.test.ts` was observed failing with the no-op stream before its
implementation, then passed with subscription/readiness/reconciliation/cancellation behavior.

The first real browser run exposed a SESSION lifecycle defect absent from mocked frame tests. The WS
chain must disable session-management authentication strategies: transport authentication is restoration
of an existing principal, not another login. A real JDBC/MockMvc regression additionally demonstrated that
FrameworkServlet's handled-event metadata reads `getSession(false)` and advances idle. The standard
mutable wrapper now ignores cookies only for `/ws` and descendants, while WsSessionAccess reads the
same CookieSerializer/JDBC session independently. The repeated `/ws/info` regression verifies unchanged
session identity and last-access time. REST session handling remains covered by existing suites.

Protocol errors use fixed client wording and categorized safe logs. Spring's raw-frame parse logger is
disabled specifically for StompSubProtocolHandler because its error path can print frame contents.
The existing Gateway logger/ProblemDetail helpers handle HTTP errors; upgraded failures close the socket.

## Local checks

Raw logs are ignored workspace artifacts under `.workspace-artifacts/pwdrz-104/`; managed browser artifacts
are under `e2e/artifacts/<run-id>/`. Test data is synthetic, and each managed stack uses a disposable DB.

| Check                                                          | Observed result                                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Backend `node tools/workspace/backendTest.mjs`                 | 389 tests, zero failures/errors/skips; package and verify pass                                                     |
| Backend mandatory coverage                                     | LINE 97.66%, BRANCH 87.15%; existing 95%/85% gates pass                                                            |
| Frontend full coverage                                         | 1332 tests in 122 files pass; statements 98.46%, branches 94.62%, functions 98.13%, lines 99.10%                   |
| Gateway full coverage                                          | 87 tests in 10 suites pass; statements 98.70%, branches 88.88%, functions 96.00%, lines 98.66%                     |
| Frontend/Gateway typecheck, lint, format and production builds | Pass after focused formatting/lint corrections                                                                     |
| E2E typecheck/format                                           | Pass                                                                                                               |
| Root tooling formatting and both infrastructure-test tasks     | Pass; no cached infrastructure run                                                                                 |
| API drift                                                      | 102 generated files match the unchanged OpenAPI contract                                                           |
| Codegen determinism/negative drift test                        | Pass                                                                                                               |
| Focused managed real-time acceptance                           | 7/7 pass, run `1795479784298-19057176`; cleanup exit 0                                                             |
| Full managed browser/integration gate                          | 59/59 pass, run `1795479881572-d7f5bb77`; cleanup exit 0                                                           |
| Deliberate browser failure probe                               | Run `1795480194452-ad44452f`: expected wrong-heading assertion fails, exit 1; cleanup completes, interrupted=false |
| Fresh full gate after failure probe                            | 59/59 pass, run `1795480306906-a6ea2687`; cleanup exit 0, interrupted=false                                        |
| Remote CI / final committed SHA                                | Remote CI unverified; branch publication authorized after local verification                                       |

No coverage thresholds/exclusions, retry policy or worker count were relaxed. Optional `E2E_TEST_GREP`
selects local diagnostic scenarios only; the complete gate and failure probe above used no filter.
Dependency installation changed no existing package version; added packages implement STOMP/SockJS and
Gateway transport tests. There is no service-local lockfile or database migration.

## Acceptance matrix

| AC  | Evidence and limit                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Approved plan and transport guide record ownership, protocols, routes, origins and recovery                                                                                                       |
| 2   | Real wsProxy outage test retains `/ws`, `/ws/info` 502 and near-prefix exclusion; shared ProblemDetail representation                                                                             |
| 3   | Real Gateway first-Upgrade/HTTP forwarding test plus browser delivery over all three supported transports                                                                                         |
| 4   | Session/account unit/security tests; browser rejects invalid CONNECT CSRF, unauthorized user/broker/topic/wildcard destinations, client SEND, origin and invalid cookie; guest `/ws/info` is 401  |
| 5   | Shared absolute/account policy tests, real JDBC no-touch regression, browser password/idle revocation, reconnect and account switch; generation cancellation tests                                |
| 6   | Existing CommentService producer, stable backend-owned event fixture, transactional commit/rollback listener test, recipient routing and publication-failure tests, real persisted reply delivery |
| 7   | Open list/bell update without reload/focus in all transport scenarios; existing read/manage regression remains in the full suite                                                                  |
| 8   | Service tests, real proxy transport tests and managed browser positive/negative/lifecycle acceptance                                                                                              |
| 9   | Sanitized protocol handler test, pre/post-upgrade error tests and browser assertion that ERROR does not echo CSRF/exception details                                                               |
| 10  | Local service/build/contract/E2E gates pass; publication subsequently authorized. Remote CI on the published revision remains unverified                                                          |
| 11  | Legacy verifier, JWT dependencies and active secret/startup requirements retired; transport/session/setup docs updated; retained scaffold ownership below                                         |
| 12  | This matrix distinguishes actual runs, initial failed regressions, intentional failure probe, local snapshot scope and unrun remote evidence                                                      |

## Targeted provisional review

Exact-key searches covered changed source, directly adjacent tests/configuration and active guides/hidden
instructions. Resolved PWDRZ-104 markers include legacy CONNECT JWT, wildcard origins, disconnected
publication/client and comments claiming the notification UI has no real-time update. API generation
continues to describe executable REST only; WS uses a separate backend-owned fixture and runtime parser.

Retained: post subscription/broadcast handlers and NewCommentEvent/VoteScoreEvent types are inactive
PWDRZ-35 scaffolding (owner Ivan in reviewed Jira). All client SEND destinations are denied; REST remains
the persisted post-subscription API. Unticketed TODO wording in those unreachable handlers was replaced
with explicit ownership/prerequisite notes as directly related completion work. Live-thread broadcasts
need a separately approved contract; PWDRZ-35 is not claimed fully unblocked/completed by this issue.
Reserved Redis/Socket.IO remain unused. No other issue is transitioned, created or messaged.

## Operational limits

Single backend instance/in-memory broker; no clustering or durable frame delivery. Missed data is recovered
from REST; an undetected send failure can leave temporary staleness. Sweep closes silent revoked sockets
within its 15-second interval; validity is also checked before private sends. Already-in-flight bytes cannot
be recalled. Browser evidence is Chromium, matching the existing project gate. Production deployment and
real-network/cross-browser compatibility beyond that evidence are not asserted.
