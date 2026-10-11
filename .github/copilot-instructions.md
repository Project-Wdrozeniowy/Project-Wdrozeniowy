# GitHub Copilot Instructions

This is tooling context, not a second source of team policy. Start with the
[developer guide index](../docs/guides/README.md), especially its
[architecture](../docs/guides/architecture.md),
[naming](../docs/guides/naming-conventions.md), and
[testing](../docs/guides/testing.md) guides. Code/configuration establish
current behaviour; a documented target may have Jira-tracked cleanup debt.

## Stack & Versions

Manual monorepo — three fully independent services. Use exact versions listed; do not upgrade or use features beyond them.

| Service  | Runtime       | Key Versions                                                       |
| -------- | ------------- | ------------------------------------------------------------------ |
| Frontend | Node.js ≥ 24  | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4                 |
| Gateway  | Node.js ≥ 24  | Express 5, TypeScript 6                                            |
| Backend  | Java 17       | Spring Boot 4, Spring Security, Spring Data JPA, jjwt 0.12.6      |
| Infra    | Docker        | PostgreSQL 16, Redis 7                                             |

Frontend additional libraries: Zustand, React Query, Axios, Zod, React Hook Form.

---

## Folder Structure Rules

Never import across service boundaries (`frontend/`, `gateway/`, `backend/` are independent).

```
frontend/src/
  app/               ← Next.js route files and composition; move feature orchestration out
    (auth)/          ← unauthenticated pages (login, register)
    (main)/          ← authenticated pages with layout
    _components/     ← page-local shared components
  services/          ← API call functions (thin ApiClient wrappers)
  store/slices/      ← shared application-state slices
  shared/types/      ← domain TypeScript types
  lib/validations/   ← Zod schemas
  components/        ← layout/ and ui/ reusable components
  providers/         ← React context providers
  constants/         ← static data only

gateway/src/
  middleware/        ← auth, cors, rateLimiter, logger
  routes/            ← proxy.ts and wsProxy.ts
  config/            ← env validation
  types/             ← GatewayConfig, Express extensions

backend/src/main/java/com/devpulse/
  <domain>/          ← controller, service, repository, entity, dto, filter
  config/            ← SecurityConfig, OpenApiConfig
  exception/         ← AppException, GlobalExceptionHandler
  security/          ← JwtUtil
```

Tests live in `__tests__/` subdirectories next to the module (frontend/gateway) or mirror the source tree (backend).
This frontend layout is a hybrid with feature-local UI and centralized
`services/` and `store/`, **not** a full FSD implementation.

---

## Naming Conventions

| Item                      | Convention                  | Example                         |
| ------------------------- | --------------------------- | ------------------------------- |
| React component files     | PascalCase `.tsx`           | `PostCard.tsx`                  |
| Non-component TS files    | camelCase `.ts`             | `authService.ts`, `usePosts.ts` |
| TypeScript interfaces/types | PascalCase, no `I` prefix | `AuthResponse`, `User`          |
| Zustand slices            | camelCase `Slice` suffix    | `createAuthSlice`, `AuthSlice`  |
| Java classes              | PascalCase                  | `AuthController`, `JwtUtil`     |
| Java packages             | `com.devpulse.<domain>.<layer>` | `com.devpulse.auth.service` |
| Custom React hooks        | camelCase `use` prefix      | `usePosts.ts`                   |

Project-owned acronyms follow word casing (`ApiClient`, `JwtUtil`, `clientIp`).
Name component props `<ComponentName>Props`; gateway modules target named
exports. The source currently contains exceptions, so do not describe a
cleanup target as already implemented.

---

## Import Rules (Frontend)

- Use `@/` alias for all cross-module imports. `@/*` maps to `frontend/src/*`.
- Use relative imports only within the same folder.
- Never use deep `../../../` paths across module boundaries — use `@/` instead.
- Any alias added to `tsconfig.json` **must** also be mirrored in `vitest.config.ts` under `resolve.alias`.

---

## Code Style

### TypeScript / TSX (frontend + gateway)

Prettier config (both services): `semi: true`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: "es5"`, `printWidth: 100`, `endOfLine: "lf"`, `jsxSingleQuote: false`.

After any TypeScript/JS change run in the affected service directory:
```bash
npm run format   # prettier --write
npm run lint     # eslint src (--fix for gateway)
```

### Java (backend)

- PascalCase classes, camelCase methods/variables.
- Use Lombok annotations when appropriate for the actual Java type; do not
  impose one recipe on every JPA entity or request DTO.
- Error responses **must** use `ProblemDetail` (RFC 9457, Spring 6 native). Never return raw strings or custom error objects.
- Follow the existing style in `com.devpulse.*`.

---

## Hard Constraints

1. **Do not add browser-persistent token storage.** Access tokens use in-memory `tokenMemory`; refresh tokens use an `HttpOnly` cookie. Do not add `localStorage` or `sessionStorage` token handling.

2. **Do not remove Redis** from Docker Compose or remove any `depends_on` referencing it as a documentation cleanup. It is provisioned for future integration, but its first use case is not yet selected.

3. **Do not remove Socket.IO** from gateway dependencies as a documentation cleanup. It is planned for future real-time work; no integrated Socket.IO path exists yet.

4. **Do not edit existing Flyway migrations.** Only add new `V<n>__description.sql` files.

5. **Swagger must stay disabled by default.** `springdoc.swagger-ui.enabled` and `springdoc.api-docs.enabled` are both controlled by `${SWAGGER_ENABLED:false}`. Never hardcode `true`.

6. **Use the documented forum API boundary.** Backend post endpoints use `/api/forum/posts`; `postService` already exposes typed adapters. The current feed remains mock-backed in `usePosts.ts` until its dedicated integration task is complete. Do not invent `/api/posts`.

7. **Do not commit or push** unless the user explicitly asks. Complete all edits and verifications, then stop.

## Task Backlog Tracking

- Use [docs/agent-task-backlog/pwdrz-jira-tasks.json](../docs/agent-task-backlog/pwdrz-jira-tasks.json) as the shared execution backlog.
- The file contains the full Jira export plus a separate `localTracking` block on each issue.
- Treat Jira fields as read-only for execution tracking; only `localTracking.status`, `localTracking.updatedAt`, `localTracking.owner`, and `localTracking.notes` change during agent work.
- Before starting a task, pick the next issue with `localTracking.status = pending` unless the user requested a specific issue key.
- When a task is in progress, set `localTracking.status = in_progress` and record the agent or user responsible in `localTracking.owner`.
- When a task is finished, set `localTracking.status = done`, refresh `localTracking.updatedAt`, and leave a brief note about what changed and where.
- If work is blocked, set `localTracking.status = blocked` and explain the blocker in `localTracking.notes`.

---

## Architecture Decisions

- **Dual JWT verification is intentional.** Gateway verifies before proxying; Spring Security re-validates as defence-in-depth. Both must share the same `JWT_SECRET`.
- **JWT_SECRET must be identical** in root `.env` (backend) and `gateway/.env`. A mismatch causes 401 on every authenticated request with no descriptive error.
- **Public routes** (no bearer JWT): `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/refresh`, `POST /api/auth/logout`.
- **Forum posts API exists**, but the forum feed still uses mock data through `usePosts.ts`. Keep API and UI integration work scoped to their tasks.

---

## Testing Conventions

| Service  | Framework                           | Test location                                          |
| -------- | ----------------------------------- | ------------------------------------------------------ |
| Frontend | Vitest 3 + React Testing Library    | `src/**/__tests__/*.test.ts(x)`                        |
| Gateway  | Jest 29 + ts-jest + supertest       | `src/__tests__/` and `src/middleware/__tests__/`       |
| Backend  | JUnit 5 + Mockito + Spring Boot Test | mirrors `src/main/java/`                              |

- Current configured coverage thresholds: ≥ 65% frontend/gateway (all metrics) and ≥ 65% backend (JaCoCo line coverage). PWDRZ-118 owns any policy change.
- Coverage-excluded folders (frontend): `app/`, `components/`, `hooks/`, `lib/`, `utils/`, `shared/`, and `constants/` (see `frontend/vitest.config.ts` for the exact globs).
- Backend Spring tests use PostgreSQL. The default test profile disables Flyway and uses Hibernate `create-drop`; tests annotated with `@MigratedSchemaTest` apply real Flyway migrations to `migration_test` and validate mappings.
- Coverage is not a substitute for behaviour-specific evidence. The mandatory
  browser E2E gate is planned under PWDRZ-117 but is not configured yet;
  PWDRZ-118 owns review of executable-code exclusions and thresholds.
- In gateway config tests, use `jest.mock('dotenv/config', () => {})` when calling `jest.resetModules()` to prevent `.env` from polluting isolated test env vars.
