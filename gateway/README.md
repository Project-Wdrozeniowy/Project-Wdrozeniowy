# API Gateway

Node.js/Express proxy on `:3000` that validates JWTs and forwards `/api/*` requests to the Spring Boot backend on `:8080`.

---

## Request Flow

```
Client
  │
  ▼
helmet → cors → morgan → rate limiter
  │
  ├─ GET /health ───────────────────────────→ { status: "ok" }
  │
  ├─ POST /api/auth/login|/register ────────→ proxy → Spring Boot :8080
  │
  ├─ Bearer token valid ────────────────────→ proxy (+ Authorization header) → Spring Boot :8080
  │
  └─ Bearer token missing / invalid / expired → 401  (request stops here)
```

---

## Quick Start

```bash
npm install
cp .env.example .env   # then set JWT_SECRET — app throws on startup if missing
npm run dev
```

---

## Environment Variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `3000` | No | Gateway listen port |
| `BACKEND_URL` | `http://localhost:8080` | No | Spring Boot base URL |
| `JWT_SECRET` | — | **Yes** | Shared secret used to verify JWT signatures |
| `CORS_ORIGINS` | `http://localhost:3001` | No | Comma-separated list of allowed browser origins |
| `RATE_LIMIT_WINDOW_MS` | `60000` | No | Rate limit window in milliseconds |
| `RATE_LIMIT_MAX` | `100` | No | Max requests per window per IP |

---

## For Frontend Developers

- **Base URL:** `http://localhost:3000/api`
- **Authentication:** include `Authorization: Bearer <token>` on every request except the public routes below
- **Public routes (no token needed):**
  - `POST /api/auth/login`
  - `POST /api/auth/register`
- **Error responses:**
  - `401` — token missing, invalid, or expired
  - `429` — rate limit exceeded; back off and retry
  - CORS error — your dev server origin is not listed in `CORS_ORIGINS`; add it there

---

## For Backend Developers (Spring Boot)

- **Only pre-validated requests arrive.** The gateway rejects any request with a missing or invalid JWT — Spring Boot will never see one.
- **Authorization header is forwarded unchanged.** `Authorization: Bearer <token>` is passed through as-is; Spring Boot can decode it if it needs the user identity.
- **Path is preserved.** A request to `/api/users/42` arrives at Spring Boot as `/api/users/42` — the gateway only rewrites the host/port.
- **No public port needed.** Spring Boot only needs to be reachable by the gateway (defaults to `localhost:8080`); it does not need to be exposed to the internet or the browser.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start with hot reload (`tsx watch`) |
| `npm start` | Run compiled output from `dist/` |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format source with Prettier |
| `npm run format:check` | Check formatting (CI) |

---

## Adding a Public Route

Edit the `publicRoutes` array in [`src/config/index.ts`](src/config/index.ts) — that is the only place that needs changing:

```ts
publicRoutes: [
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/register' },
  { method: 'POST', path: '/api/auth/refresh' }, // add new entry here
],
```

Both `method` and `path` must match exactly (case-sensitive).

---

## Project Structure

```
gateway/
├── src/
│   ├── types/index.ts          # shared interfaces + Express.Request augmentation
│   ├── config/index.ts         # env var loading and validation
│   ├── middleware/
│   │   ├── cors.ts
│   │   ├── rateLimiter.ts
│   │   ├── logger.ts
│   │   └── auth.ts             # JWT validation
│   ├── routes/proxy.ts         # http-proxy-middleware → Spring Boot
│   ├── app.ts                  # Express app (middleware wiring)
│   └── index.ts                # server entry point
├── .env.example
├── tsconfig.json
├── eslint.config.mjs
└── .prettierrc.json
```
