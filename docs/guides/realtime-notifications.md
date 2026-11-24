# Real-time notifications (PWDRZ-104)

Spring owns notification persistence, recipients and SESSION/CSRF security. Express forwards the
external `/ws` and descendants to Spring `/api/ws`; it does not authenticate frames or decide recipients.
React uses STOMP over SockJS, preferring WebSocket and falling back to XHR streaming or long polling.
Iframe/JSONP transports are not supported. Production uses the SPA's HTTPS origin and secure SESSION cookie.

## Contract and recovery

Subscribe to exactly `/user/queue/notifications`. Client SEND, broker queue access, other user paths and
wildcard subscriptions are denied. The broker uses `/queue`; `/user` is the user-destination prefix.

After the broker registers the subscription, that connection receives `{"version":1,"type":"stream.ready"}`.
The client then reconciles existing notification queries through REST. A persisted notification produces
`{"version":1,"type":"notification.created","eventId":"notification.created:123","notificationId":123}`.
The server derives the recipient from persisted notification data; the event contains no notification text,
comment body, recipient identifier or destination URL. Frontend validates the envelope before invalidation.

Notifications are saved with the existing comment/reply transaction and published after commit. Rollback
publishes nothing. Transport failure cannot turn an already committed comment into an HTTP failure.
The database and generated REST operations remain authoritative, including destination privacy checks.
There is no outbox, acknowledged delivery or durable replay of individual frames. Offline/missed notifications
are recovered by REST reconciliation after connection/reconnection or opening the center. An undetected
delivery failure can temporarily leave the UI stale until reconciliation. This is an explicit delivery limit.

The client coalesces invalidations and repeats reconciliation when an event arrives during a read. It does
not increment unread counts locally. REST ordering and notification IDs determine the visible list, so
duplicate/out-of-order events cannot create duplicate records or roll back read/delete state.

## Session lifecycle

Transport requests read the standard JDBC SESSION and existing principal/account policy without creating
or saving an HttpSession. CONNECT requires the masked CSRF token from the existing `/api/auth/csrf` flow.
Only the `/ws` security chain omits HTTP CSRF; CONNECT CSRF and explicit origins protect the transport.
REST's CSRF and activity semantics stay unchanged. SockJS polling, heartbeats, reconnect and server-side
validity checks must not extend the 60-minute idle or 12-hour absolute deadline.

Connections are bound to a specific HTTP session and principal. Recipient sends and outbound delivery
recheck validity; a 15-second scheduled sweep closes idle/expired/revoked connections even when silent.
Already-in-flight network bytes cannot be recalled. Deletion/deactivation/ban, auth-version changes and
session removal invalidate further delivery. A database validation failure fails closed.

Each authenticated tab owns one connection. Session generations abort old callbacks/reconnect immediately
on logout/account replacement. Reconnect backs off with jitter. A read-only `/ws/info` probe after a transport
close lets the existing unauthorized handler recognize expiry without a keep-alive REST profile loop.
Protocol refusal stops the stream and offers the existing explicit session recovery action.

## Configuration and bounds

`WS_ALLOWED_ORIGINS` is a comma-separated list of exact browser origins, including the external gateway
origin. Local defaults are `http://localhost:3001,http://localhost:3000`; managed E2E supplies its exact
`http://127.0.0.1:<port>` origin. No wildcard or credential-bearing URL is accepted.

Spring bounds frames to 16 KiB, outbound buffers to 64 KiB, send/first-frame deadlines to 10 seconds and
SockJS cache to 32 messages. Gateway bounds HTTP bodies with its existing body budget and bounds Upgrade
negotiation; it does not apply the REST absolute response deadline to a healthy long-lived stream.
Pre-upgrade HTTP errors use the existing ProblemDetail convention. Upgraded errors close the transport;
protocol errors return fixed wording. Raw frame/CSRF/cookie/exception logging is disabled or sanitized.

This implementation is for one backend instance with the in-memory simple broker. Redis and Socket.IO
remain reserved and unused; this does not implement clustering. JWT is retired from the notification path
and is not required for startup. No database migration or new REST endpoint is introduced.

## Scope and design

The existing comment/reply eligibility rules, notification center, All/Unread filter and accessible
read/read-all/delete actions are reused. Incoming data does not move keyboard focus. Figma's notification
frames (`197:609`, `197:1470`, `197:1193` in Orbita `J2k3T1a2db6v51UckdUyEU`) provide light/dark unread
and all-read reference states. Messages/System category filters, example like/trending/weekly producers
and a full screen restyle are outside PWDRZ-104.

Post-broadcast DTOs/handlers are inactive historical PWDRZ-35 scaffolding: SEND is denied, and REST owns
persisted post subscriptions. Their prerequisite is a separately approved live-thread contract; PWDRZ-104
does not implement or certify live post/comment/vote broadcasts.

## Verification

Use the normal service gates and managed `npm test --workspace e2e`. For local diagnosis only,
`E2E_TEST_GREP=realtime:` selects feature scenarios while retaining launcher-owned startup/cleanup.
An unset filter (normal local/CI invocation) runs the full suite. A filtered run is not the full E2E gate.
Execution results and remaining limitations belong in the PWDRZ-104 execution record.
