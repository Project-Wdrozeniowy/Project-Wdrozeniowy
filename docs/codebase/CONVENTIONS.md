# Coding Conventions

## Core Sections (Required)

### 1) Naming Rules

#### TypeScript / TSX (frontend + gateway)

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| React component files | PascalCase `.tsx` | `PostCard.tsx`, `ProfileTabs.tsx` | [frontend/src/app/_components/](../../frontend/src/app/_components/) |
| Non-component TS files | camelCase `.ts` | `authService.ts`, `usePosts.ts`, `format.ts` | [frontend/src/services/](../../frontend/src/services/) |
| Interfaces/types | PascalCase, no `I` prefix | `AuthResponse`, `GatewayConfig`, `User` | [frontend/src/shared/types/index.ts](../../frontend/src/shared/types/index.ts), [gateway/src/types/index.ts](../../gateway/src/types/index.ts) |
| Zustand slices | camelCase, suffix `Slice` | `createAuthSlice`, `AuthSlice` | [frontend/src/store/slices/authSlice.ts](../../frontend/src/store/slices/authSlice.ts) |
| Constants / env keys | `UPPER_SNAKE_CASE` for env vars; `camelCase` const names in TS | `TOKEN_KEY`, `SESSION_COOKIE` | [frontend/src/services/authService.ts](../../frontend/src/services/authService.ts) |
| Enums | PascalCase name, uppercase members | `CategoryKey.AI`, `CategoryKey.GAMING` | [frontend/src/shared/types/index.ts](../../frontend/src/shared/types/index.ts) |

#### Java (backend)

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Classes / interfaces | PascalCase | `AuthController`, `JwtUtil`, `AppException` | [backend/src/main/java/com/devpulse/](../../backend/src/main/java/com/devpulse/) |
| Methods / variables | camelCase | `register()`, `accessExpirySeconds` | [backend/.../AuthController.java](../../backend/src/main/java/com/devpulse/auth/controller/AuthController.java) |
| Constants | `UPPER_SNAKE_CASE` | n/a (none observed in production code) | — |
| Packages | `com.devpulse.<domain>.<layer>` | `com.devpulse.auth.service` | [backend/src/main/java/com/devpulse/](../../backend/src/main/java/com/devpulse/) |

#### Git / Branches / Commits

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Branch name | `type/TICKET-ID-short-description` | `feature/PWDRZ-30-login-page` | [docs/guides/working_with_branches.md](../../docs/guides/working_with_branches.md) |
| Commit message | `[PWDRZ-<n>]: Short imperative description` | `[PWDRZ-33]: Fix prettier formatting` | git log (scan output) |
| PR title | `[PWDRZ-<n>]: Short description` | `[PWDRZ-28]: Implement routing and application layout` | [.github/pull_request_template.md](../../.github/pull_request_template.md) |

---

### 2) Formatting and Linting

#### Frontend

- **Formatter**: Prettier 3 — config at [frontend/.prettierrc](../../frontend/.prettierrc)
  - `semi: true`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: "es5"`, `printWidth: 100`, `endOfLine: "lf"`, `jsxSingleQuote: false`
- **Linter**: ESLint 9 with `eslint-config-next` — config at [frontend/eslint.config.mjs](../../frontend/eslint.config.mjs)
- **Run commands**:
  ```bash
  npm run format        # prettier --write .
  npm run format:check  # prettier --check . (CI gate)
  npm run lint          # eslint src
  ```

#### Gateway

- **Formatter**: Prettier 3 — config at [gateway/.prettierrc](../../gateway/.prettierrc) (identical rules to frontend)
- **Linter**: ESLint 10 with `typescript-eslint` + `eslint-plugin-prettier` — config at [gateway/eslint.config.mjs](../../gateway/eslint.config.mjs)
- **Run commands**:
  ```bash
  npm run format        # prettier --write src
  npm run format:check  # prettier --check src (CI gate)
  npm run lint          # eslint src
  npm run lint:fix      # eslint src --fix
  ```

#### Backend (Java)

- No formatter config found in the repository. [ASK USER] Is a Java formatter (e.g., google-java-format, Spotless Maven plugin) planned?

---

### 3) Import and Module Conventions

#### Frontend
- **Path alias**: `@/*` resolves to `./src/*` — defined in [frontend/tsconfig.json](../../frontend/tsconfig.json) and mirrored in [frontend/vitest.config.ts](../../frontend/vitest.config.ts)
  - Example: `import type { User } from '@/shared/types'` → `frontend/src/shared/types/index.ts`
- **Relative imports**: used only within the same module/folder; cross-module imports use `@/`
- **Barrel exports**: `frontend/src/shared/types/index.ts` acts as a barrel for domain types; `frontend/src/services/` does not have a barrel file

#### Gateway
- **Relative imports** only; no path aliases configured
- **Module system**: CommonJS (`"type": "commonjs"` in [gateway/package.json](../../gateway/package.json))

#### Backend
- Standard Java imports; no custom rules observed beyond package convention

---

### 4) Error and Logging Conventions

#### Backend
- **Error strategy**: All domain exceptions are thrown as `AppException` (carries `HttpStatus` + message). `GlobalExceptionHandler` catches it and returns RFC 9457 `ProblemDetail`. Validation errors return `ProblemDetail` with a field-level `errors` map.
- **Response format**: RFC 9457 ProblemDetail (Spring 6 native) — `type`, `title`, `status`, `detail`, optional `errors` property.
- **Logging**: Lombok `@Slf4j` on `JwtUtil`; [ASK USER] no structured logging config observed — is a log aggregator (e.g., ELK, Loki) planned?

#### Gateway
- **Request logging**: morgan HTTP logger in [gateway/src/middleware/logger.ts](../../gateway/src/middleware/logger.ts)
- **Error logging**: `console.error` in proxy error handler; no structured logging
- **Auth errors**: explicit JSON responses (`{ error: "..." }`) with appropriate HTTP status codes (401, 429, 500)

#### Frontend
- **HTTP error handling**: axios response interceptor in [frontend/src/services/api.ts](../../frontend/src/services/api.ts) — auto-redirects to `/login` on 401
- **Sensitive data**: JWT stored in `localStorage` and a lightweight non-httpOnly session cookie (`orbita_session`) — see [CONCERNS.md](CONCERNS.md) for XSS risk

---

### 5) Testing Conventions

- **Test file location**: co-located `__tests__/` subdirectory (frontend, gateway); parallel `src/test/java` tree (backend)
- **Naming convention**:
  - Frontend/gateway: `<FileName>.test.ts` or `<FileName>.test.tsx` inside `__tests__/`
  - Backend: `<ClassName>Test.java`
- **Mocking strategy**:
  - Frontend: `axios-mock-adapter` for HTTP; no DOM event mocking library observed beyond React Testing Library
  - Gateway: Jest manual mocks; `supertest` for HTTP-level integration tests
  - Backend: `@SpringBootTest` + `@MockitoBean` pattern; H2 in-memory for unit tests, real PostgreSQL (CI service) for integration
- **Coverage thresholds**: 65% lines/functions/branches/statements (frontend vitest, gateway jest) — enforced in CI

---

### 6) Evidence

- [frontend/.prettierrc](../../frontend/.prettierrc)
- [gateway/.prettierrc](../../gateway/.prettierrc)
- [frontend/eslint.config.mjs](../../frontend/eslint.config.mjs)
- [gateway/eslint.config.mjs](../../gateway/eslint.config.mjs)
- [frontend/tsconfig.json](../../frontend/tsconfig.json)
- [frontend/src/shared/types/index.ts](../../frontend/src/shared/types/index.ts)
- [backend/src/main/java/com/devpulse/exception/GlobalExceptionHandler.java](../../backend/src/main/java/com/devpulse/exception/GlobalExceptionHandler.java)
- [docs/guides/working_with_branches.md](../../docs/guides/working_with_branches.md)
- [docs/guides/branch_namings.md](../../docs/guides/branch_namings.md)
