# GitHub Copilot Instructions

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
  app/               ← Next.js App Router pages only; no logic here
    (auth)/          ← unauthenticated pages (login, register)
    (main)/          ← authenticated pages with layout
    _components/     ← page-local shared components
  services/          ← API call functions (thin ApiClient wrappers)
  store/slices/      ← Zustand slices only
  shared/types/      ← domain TypeScript types
  lib/validations/   ← Zod schemas
  components/        ← layout/ and ui/ reusable components
  providers/         ← React context providers
  constants/         ← static data only

gateway/src/
  middleware/        ← auth, cors, rateLimiter, logger
  routes/            ← proxy.ts only
  config/            ← env validation
  types/             ← GatewayConfig, Express extensions

backend/src/main/java/com/devpulse/
  <domain>/          ← controller, service, repository, entity, dto, filter
  config/            ← SecurityConfig, OpenApiConfig
  exception/         ← AppException, GlobalExceptionHandler
  security/          ← JwtUtil
```

Tests live in `__tests__/` subdirectories next to the module (frontend/gateway) or mirror the source tree (backend).

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
- Use Lombok: `@Data`, `@Builder`, `@RequiredArgsConstructor`, `@Slf4j`.
- Error responses **must** use `ProblemDetail` (RFC 9457, Spring 6 native). Never return raw strings or custom error objects.
- Follow the existing style in `com.devpulse.*`.

---

## Hard Constraints

1. **Do not cement localStorage for JWT.** Current code uses localStorage, but the direction is `httpOnly` cookies. Do not add new code that further couples auth tokens to localStorage.

2. **Do not remove Redis** from Docker Compose or remove any `depends_on` referencing it. Provisioned for future caching/sessions.

3. **Do not remove Socket.IO** from gateway dependencies. Planned for real-time forum notifications.

4. **Do not edit existing Flyway migrations.** Only add new `V<n>__description.sql` files.

5. **Swagger must stay disabled by default.** `springdoc.swagger-ui.enabled` and `springdoc.api-docs.enabled` are both controlled by `${SWAGGER_ENABLED:false}`. Never hardcode `true`.

6. **Do not call `/api/posts` or other unimplemented forum endpoints.** `forumService.ts` returns static fixtures — the backend forum API does not exist yet.

7. **Do not commit or push** unless the user explicitly asks. Complete all edits and verifications, then stop.

---

## Architecture Decisions

- **Dual JWT verification is intentional.** Gateway verifies before proxying; Spring Security re-validates as defence-in-depth. Both must share the same `JWT_SECRET`.
- **JWT_SECRET must be identical** in root `.env` (backend) and `gateway/.env`. A mismatch causes 401 on every authenticated request with no descriptive error.
- **Public routes** (no JWT): `POST /api/auth/login`, `POST /api/auth/register`.
- **Forum data is mocked** in `forumService.ts`. Do not wire it to a real endpoint until the backend API exists.

---

## Testing Conventions

| Service  | Framework                           | Test location                                          |
| -------- | ----------------------------------- | ------------------------------------------------------ |
| Frontend | Vitest 3 + React Testing Library    | `src/**/__tests__/*.test.ts(x)`                        |
| Gateway  | Jest 29 + ts-jest + supertest       | `src/__tests__/` and `src/middleware/__tests__/`       |
| Backend  | JUnit 5 + Mockito + Spring Boot Test | mirrors `src/main/java/`                              |

- Coverage thresholds: ≥ 65% frontend/gateway, ≥ 50% backend.
- Coverage-excluded folders (frontend): `app/`, `components/`, `hooks/`, `types/`, `constants/`.
- Backend tests use `src/test/resources/application-test.properties` — no Flyway, no real DB.
- In gateway config tests, use `jest.mock('dotenv/config', () => {})` when calling `jest.resetModules()` to prevent `.env` from polluting isolated test env vars.
