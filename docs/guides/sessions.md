# HTTP sessions (PWDRZ-99)

Spring owns authentication, persisted sessions and resource authorization. Express
serves the SPA and proxies `/api` to a fixed backend origin. The browser uses the
single generated-operation transport with cookies; REST Bearer/refresh credentials
are retired. See [execution evidence](../agent-task-backlog/pwdrz-99-execution.md)
for the PostgreSQL, browser and service verification results.

## Cookie, deadlines and revocation

`SESSION` is opaque, host-only, HttpOnly, Path=/, SameSite=Strict. Normal issuance
has no Max-Age/Expires. `COOKIE_SECURE=true` is the default; set it to false only
for an explicitly configured plain-HTTP development contour. Production uses
same-origin HTTPS. Path=/ includes the future WS handshake; it does not grant WS
authorization. Browser session restoration may retain cookies: closing a browser
is not guaranteed logout.

Spring Session JDBC enforces 60 minutes of HTTP inactivity, independently of its
expired-row cleanup. Anonymous CSRF bootstrap sessions expire after 15 minutes.
Static assets go to Express and do not touch sessions. There is no heartbeat.
The serialized minimal principal holds user ID, username, auth version and an
immutable successful authentication timestamp. Before CSRF/resource authorization,
Spring checks account existence/status, current auth version and the 12-hour
absolute deadline, and refreshes authorities from the current account role.
Reloads, CSRF renewal and application restarts do not reset the timestamp.

Independent browser sessions remain independent. Logout deletes the current
browser's session rows; password change verifies the current password under a
user row lock and increments `users.auth_version`, rejecting all prior sessions
on subsequent requests. Revocation does not roll back operations already running.
`@DynamicUpdate` prevents an unrelated stale profile update overwriting the
password/version. Login acquires the same user lock and refreshes its JPA state
before verifying credentials.

## Authentication and CSRF

1. Read `GET /api/users/me` to restore presentation from an existing session.
   A 401 means guest/expired; network/5xx failures are recoverable unknown state.
   Initial page queries mount after this attempt settles, so an unknown cookie
   identity cannot populate a public cache before bootstrap. Later authentication
   transitions keep forms mounted. A focus check of an unchanged identity does
   not invalidate successful in-flight guest reads or supersede explicit login.
2. Before an unsafe operation, read `GET /api/auth/csrf`. It creates/reuses an
   anonymous session if needed and returns `{token, headerName}` with no-store.
3. Send the returned token in its named header, with cookies. This also applies
   to register, login and logout. Missing/wrong/stale CSRF returns 403 **before**
   authentication checks; a protected write with valid CSRF but no authentication
   returns 401. A safe protected request without authentication returns 401.
4. Register returns 201 and login 204, with a new session cookie and no payload.
   Spring fixation protection invalidates the old row and creates a new one;
   the context is explicitly saved. Renew CSRF after authentication, then load
   `/users/me`. A failed profile read never repeats the credential mutation.
   For a confirmed guest, a 401 from the login POST or a 409 from the registration
   POST keeps the form mounted in guest state and displays its credential or field
   error. When the prior identity is uncertain or authenticated, read the profile
   to reconcile the cookie. A network failure or failed post-login CSRF/profile
   read shows the session recovery action. Retry reads only `/users/me`.
5. Logout returns 204 and clears the cookie. To log out again as a guest, obtain
   a new CSRF token first. Cookie deletion may use Max-Age=0/expired Expires.

The transport does not replay mutations or perform refresh/autologin. A 403 is
an access/CSRF failure; the next explicit action may renew CSRF. Tabs exchange
only identity-change notifications through BroadcastChannel or storage events,
and reconcile on focus. Generation checks and cancellation discard stale results
and user-bound cache work. No Web Locks dependency or browser-persisted credential
is introduced. A failed/ambiguous logout hides the old identity and offers server
reconciliation instead of claiming confirmed logout.

## Implemented endpoint/method access matrix

Paths below are relative to `/api`. GET routes also support normal MVC HEAD;
OPTIONS is safe. Unsafe operations always require CSRF. Public reads accept a
valid session where implemented (for example `myVote`); invalid sessions browse
as guests. Existing service ownership checks remain authoritative.

| Operations                                                                                                                                | Access and ownership                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| GET `/auth/csrf`; POST `/auth/register`, `/auth/login`, `/auth/logout`                                                                    | Public; unsafe operations require CSRF                                |
| GET `/forum/categories`, `/forum/categories/{slug}`, `/forum/posts`, `/forum/posts/{slug}`, `/forum/posts/{slug}/comments`, `/forum/tags` | Public/optional authentication                                        |
| GET `/search`, `/recommendations/posts`, `/recommendations/tags`, `/analytics/trending-posts`, `/users/{username}`                        | Public; `/users/me` takes precedence over the public username matcher |
| GET/PATCH `/users/me`; POST `/users/me/password`; GET `/users/me/subscriptions`                                                           | Current authenticated account only                                    |
| POST `/forum/posts`                                                                                                                       | Authenticated; existing category/content validation                   |
| PATCH/DELETE `/forum/posts/{slug}`                                                                                                        | Author, ADMIN or MODERATOR via PostSecurity                           |
| PATCH `/forum/posts/{slug}/pin`                                                                                                           | ADMIN or MODERATOR                                                    |
| POST/PATCH/DELETE `/forum/categories[/{slug}]`                                                                                            | ADMIN                                                                 |
| POST `/forum/posts/{slug}/comments`; PATCH/DELETE `/forum/comments/{id}`                                                                  | Authenticated; existing author/moderation checks for mutation         |
| POST `/forum/votes`; DELETE `/forum/votes/{id}`                                                                                           | Authenticated; vote owner rules                                       |
| PUT/DELETE `/forum/posts/{slug}/subscription`                                                                                             | Authenticated; current user's subscription                            |
| GET `/notifications`; PATCH `/notifications/read-all`, `/notifications/{id}/read`; DELETE `/notifications/{id}`                           | Authenticated recipient only                                          |
| POST `/ai/suggest-tags`; GET `/analytics/me`                                                                                              | Authenticated; existing service validation                            |
| GET `/analytics/posts/{id}`                                                                                                               | ADMIN or MODERATOR                                                    |
| GET `/analytics/summary`, `/analytics/trends`, `/admin/ping`                                                                              | ADMIN                                                                 |

Unknown safe API paths return MVC 404, wrong methods return 405, with
ProblemDetail rather than SPA HTML; unsafe requests still undergo CSRF first.
Known private paths require authentication even when their particular resource
does not exist. Hidden 501 placeholders retain their owning tasks and are not
published as implemented contracts. Swagger is development-only and disabled by
default. Session-store failures outside MVC are masked as ProblemDetail 503;
unexpected filter failures become 500. Query strings/credentials are excluded
from Gateway error and access logs.

## Concurrency and persistence decisions

V8 adds the standard Spring Session tables and `auth_version`; V9 drops only the
legacy refresh-token table. Historical migrations stay immutable. The standard
repository uses the application transaction manager and immediate flush so auth
state is written inside the authentication transaction before success is returned.

Repository interleaving tests demonstrate that `changeSessionId` on an existing
row can be undone by another loaded request's late save. Standard Spring
`SessionFixationProtectionStrategy` creates a new row instead. Deleted rows are
not reinserted by an ordinary late save. A small PostgreSQL transaction advisory
lock serializes authentication/logout transitions for a browser lineage stored
in the existing principal-name index. It prevents a logout that already loaded
the old session from missing a concurrently committed replacement. Normal
requests are not serialized; no extra lifecycle table, token registry or custom
session repository exists. A request whose old session was already removed fails
with 403 and must explicitly bootstrap again. PostgreSQL lock/transaction
verification results are recorded in the [execution notes](../agent-task-backlog/pwdrz-99-execution.md).

## One-release cutover

Use one coordinated release of backend, Gateway and SPA. Stop serving the old
versions; apply forward-only V8/V9 through Flyway; start the new stack and perform
the migrated-schema/session acceptance checks before exposing it. V9 permanently
removes old refresh credentials. No rollback to the JWT backend is promised.
Keep the deployment's normal database backup/recovery procedure; do not delete
users, hashes or product data. Clear `refreshToken` using `COOKIE_PATH` (the old
path, default `/api/auth`). Existing users sign in again. Gateway no longer needs
`JWT_SECRET`; backend temporarily retains it solely for the isolated WS verifier.

## Ownership and extension points

PWDRZ-104 owns session-principal handshake integration, origin/CONNECT CSRF,
destination/recipient checks and expiry/logout for established connections.
The HTTP `/ws` and `/ws/**` boundary explicitly requires authentication: SockJS
uses a separate HandlerMapping and must not fall through the MVC unknown-path rule.
`WsTokenVerifier` is isolated legacy compatibility, with no REST issuer or SPA
token consumer. Existing provisional WS behavior is not a completed secure WS
flow, and this change does not claim PWDRZ-104 unblocked.

PWDRZ-161 may evaluate Spring RememberMeServices with a separate, revocable
persistent credential. Successful restoration must call the same establishment
lifecycle to create a **fresh limited session**, check account-wide revocation
and renew CSRF. PWDRZ-99 adds no remember-me filter, flag, UI, credential table,
cookie, restoration endpoint or dormant implementation. PWDRZ-150 continues to
own full profile-state consolidation; session isolation is implemented here.
