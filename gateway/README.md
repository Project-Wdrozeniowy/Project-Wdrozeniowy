# API Gateway

Express 5 serves the built SPA and forwards `/api/*` to Spring Boot. Spring owns
JDBC sessions, CSRF and authorization. See the [session guide](../docs/guides/sessions.md)
for contracts, access rules, migration and deferred verification.

## Running

Run `npm ci` at the repository root, copy `gateway/.env.example` to `gateway/.env`,
then use `npm run dev` in `gateway/` for API-only development. Vite owns HMR.
`npm run build` compiles Gateway. `npm start` serves compiled Gateway and sibling
`frontend/dist`, failing if the HTML build is missing. Root `nx run gateway:serve`
builds both first. Build images from the root: `docker build -f gateway/Dockerfile .`.

`--spa` or `SERVE_SPA=true` enables static hosting; `SPA_DIST_DIR` overrides its
default artifact directory. See the [workspace guide](../docs/guides/monorepo.md).

## Request boundary

Helmet, explicit CORS and credential-safe path-only logging precede routing.
Health/static traffic does not consume the API quota. API rate limits, dedicated
login/CSRF limits and bounded raw-body buffering run before the fixed-target proxy.
There is no REST JWT verifier, shared signing key or public-route allowlist.

Method, `/api` path/query, original body bytes, Cookie, X-CSRF-TOKEN, upstream
status/headers and multiple Set-Cookie values are preserved. Express never trusts
client-supplied user identity headers. Forwarded/X-Forwarded-\* values are rebuilt
from Express's explicitly configured proxy trust and request properties.
Production access is same-origin HTTPS; development uses explicit CORS origins.
The backend should only be reachable through the approved ingress/network.

Unknown API paths keep backend ProblemDetail errors even with HTML Accept.
API and the existing separate WS proxy precede static fallback. HTML is no-cache,
fingerprinted assets immutable, missing assets/non-GET navigation retain errors.
Unknown browser URLs get the shell and client not-found page.

## Configuration

| Variable             | Default               | Meaning                                              |
| -------------------- | --------------------- | ---------------------------------------------------- |
| PORT                 | 3000                  | Listener                                             |
| BACKEND_URL          | http://localhost:8080 | Fixed HTTP(S) origin; no credentials/path/query/hash |
| CORS_ORIGINS         | http://localhost:3001 | Explicit comma-separated browser origins             |
| TRUSTED_PROXY_CIDRS  | empty                 | Direct access by default; explicit IPs/CIDRs only    |
| RATE_LIMIT_WINDOW_MS | 60000                 | Per-IP quota window                                  |
| RATE_LIMIT_MAX       | 100                   | All API requests per window                          |
| LOGIN_RATE_LIMIT_MAX | 10                    | Additional login quota                               |
| CSRF_RATE_LIMIT_MAX  | 30                    | Additional CSRF bootstrap quota                      |
| API_MAX_BODY_BYTES   | 1048576               | Maximum raw request bytes                            |
| BODY_TIMEOUT_MS      | 10000                 | Request-body deadline                                |
| UPSTREAM_TIMEOUT_MS  | 25000                 | Total upstream response deadline                     |
| NODE_ENV             | development           | Set production for HTTPS Helmet policy               |

Budgets are positive safe integers. The 1 MiB body limit accommodates the largest
implemented post DTO (100,000 characters, including worst-case JSON escaping),
profile/comment/auth payloads and current pagination/filter requests. No implemented
HTTP upload/stream endpoint exists. AI transport uses 10-second connect and read
budgets; 25 seconds leaves room for these. The frontend's 40-second deadline exceeds the
10-second body plus 25-second upstream budgets, so Gateway errors can arrive first.
Controlled-upstream tests exercise payload and timeout boundaries. Production
latency/topology and full-stack acceptance still need the evidence recorded in the
execution note; new long-running/upload contracts must explicitly revisit budgets.

For a TLS reverse proxy, configure only its actual addresses/subnets and have it
replace forwarding headers. Empty trust is correct for direct HTTP development.
Do not use `trust proxy=true` or an arbitrary hop count. These local per-process
rate counters use the existing implementation; scaling to multiple edge replicas
needs a separately agreed deployment policy.

## Failures and tests

Gateway-originated failures use RFC 9457-compatible ProblemDetail with no-store:
408 body deadline, 413 size, 415 unsupported compression, 429 quota, 502 unavailable
or aborted upstream, 504 deadline. Legitimate backend errors pass through unchanged.
After partial headers/body have been sent, terminate the response instead of
appending JSON or retrying. No mutation is automatically replayed. Logs omit query
strings, authorization/cookie headers, credentials and upstream exception messages.

`npm run typecheck`, `lint`, `format:check`, `test:coverage` and `build` are service
gates. All four configured coverage thresholds remain mandatory. Controlled HTTP
upstream tests require no real database; managed browser tests are a separate gate.

The WS proxy remains provisional under PWDRZ-104. This REST transition neither
completes its session handshake/destination security nor adds a WS JWT issuer.
