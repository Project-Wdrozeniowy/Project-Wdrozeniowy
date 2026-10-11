# Coding Conventions

> Snapshot scope: verified against repository files and configuration on 2026-10-11. This is an observed-state reference, not the source of approved team rules. The [developer guides](../guides/README.md) hold target conventions, which may differ from old code. Current test configuration enforces 65%; CI job labels that say 50% are stale. GitHub ruleset enforcement could not be verified from this checkout.

## Core Sections (Required)

### 1) Naming Observed in Source

#### TypeScript / TSX (frontend + gateway)

| Item | Observed shape | Example | Evidence |
|------|------|---------|----------|
| React component files | PascalCase `.tsx` | `PostCard.tsx`, `ProfileTabs.tsx` | [frontend/src/app/_components/](../../frontend/src/app/_components/) |
| Non-component TS files | camelCase `.ts` | `authService.ts`, `usePosts.ts`, `format.ts` | [frontend/src/services/](../../frontend/src/services/) |
| Interfaces/types | PascalCase, no `I` prefix | `AuthResponse`, `GatewayConfig`, `User` | [frontend/src/shared/types/index.ts](../../frontend/src/shared/types/index.ts), [gateway/src/types/index.ts](../../gateway/src/types/index.ts) |
| Zustand slices | camelCase, suffix `Slice` | `createAuthSlice`, `AuthSlice` | [frontend/src/store/slices/authSlice.ts](../../frontend/src/store/slices/authSlice.ts) |
| Constants / env keys | `UPPER_SNAKE_CASE` for env vars; both upper-case predefined values and camelCase runtime values occur in TS | `JWT_SECRET`, `MOCK_POSTS`, `tokenMemory` | [.env.example](../../.env.example), [frontend/src/constants/posts.ts](../../frontend/src/constants/posts.ts), [frontend/src/lib/tokenMemory.ts](../../frontend/src/lib/tokenMemory.ts) |
| Domain value unions | String-literal unions, not a `CategoryKey` enum | `UserRole`, `VoteType` | [frontend/src/shared/types/index.ts](../../frontend/src/shared/types/index.ts) |

#### Java (backend)

| Item | Observed shape | Example | Evidence |
|------|------|---------|----------|
| Classes / interfaces | PascalCase | `AuthController`, `JwtUtil`, `AppException` | [backend/src/main/java/com/devpulse/](../../backend/src/main/java/com/devpulse/) |
| Methods / variables | camelCase | `register()`, `accessExpirySeconds` | [backend/.../AuthController.java](../../backend/src/main/java/com/devpulse/auth/controller/AuthController.java) |
| Constants | No project-wide production naming pattern established by this snapshot | — | [backend/src/main/java/com/devpulse/](../../backend/src/main/java/com/devpulse/) |
| Packages | `com.devpulse.<domain>.<layer>` | `com.devpulse.auth.service` | [backend/src/main/java/com/devpulse/](../../backend/src/main/java/com/devpulse/) |

#### Git / Branches / Commits

Historical branch names include both `type/PWDRZ-...` and other forms; they
do not establish the newly approved branch pattern or prove GitHub ruleset
behaviour. Jira-prefixed commit subjects are visible in Git history. For new
branches, commits, and PRs, follow the [Git workflow](../guides/git-workflow.md).

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

- No Java formatter configuration or formatting CI gate is present. This is an observation, not a decision to add one.

---

### 3) Import and Module Conventions

#### Frontend
- **Path alias**: `@/*` resolves to `./src/*` — defined in [frontend/tsconfig.json](../../frontend/tsconfig.json) and mirrored in [frontend/vitest.config.ts](../../frontend/vitest.config.ts)
  - Example: `import type { User } from '@/shared/types'` → `frontend/src/shared/types/index.ts`
- **Relative imports**: also occur in local tests and nearby modules; the guide
  defines how new cross-module imports should be written.
- **Barrel exports**: `frontend/src/shared/types/index.ts` acts as a barrel for domain types; `frontend/src/services/` does not have a barrel file

#### Gateway
- **Relative imports** only; no path aliases configured
- **Module system**: CommonJS (`"type": "commonjs"` in [gateway/package.json](../../gateway/package.json))

#### Backend
- Standard Java imports; no custom rules observed beyond package convention

---

### 4) Error and Logging Conventions

#### Backend
- **Error strategy**: `AppException` carries a status and message for handled
  application failures. `GlobalExceptionHandler` also handles validation and
  other framework errors and returns RFC 9457 `ProblemDetail` responses.
- **Response format**: RFC 9457 ProblemDetail (Spring 6 native) — `type`, `title`, `status`, `detail`, optional `errors` property.
- **Logging**: Lombok `@Slf4j` on `JwtUtil`; no structured/JSON logging configuration or log aggregator is observed. This snapshot does not prescribe one.

#### Gateway
- **Request logging**: morgan HTTP logger in [gateway/src/middleware/logger.ts](../../gateway/src/middleware/logger.ts)
- **Error logging**: the HTTP proxy and error handler use the gateway's `logger.error`; the separate WebSocket proxy still uses `console.error`. No structured/JSON logging configuration is present
- **Auth errors**: `sendError` returns JSON containing `status`, `error`, `message`, `path`, and `timestamp` with the corresponding HTTP status

#### Frontend
- **HTTP error handling**: axios response interceptor in [frontend/src/services/api.ts](../../frontend/src/services/api.ts) — on a protected request's 401, refreshes once and retries; redirects to `/login` if refresh or the retry fails
- **Sensitive data**: access JWTs are held in `tokenMemory`; refresh tokens are sent only in an `HttpOnly; SameSite=Strict` cookie. The developer/agent guides own the prohibition on browser-persistent token storage.

---

### 5) Testing Conventions

- **Test file location**: co-located `__tests__/` subdirectory (frontend, gateway); parallel `src/test/java` tree (backend)
- **Naming convention**:
  - Frontend/gateway: `<FileName>.test.ts` or `<FileName>.test.tsx` inside `__tests__/`
  - Backend: `<ClassName>Test.java`
- **Mocking strategy**:
  - Frontend: `axios-mock-adapter` for HTTP; no DOM event mocking library observed beyond React Testing Library
  - Gateway: Jest manual mocks; `supertest` for HTTP-level integration tests
  - Backend: focused Mockito tests without a database, Spring tests with PostgreSQL and `create-drop`, and `@MigratedSchemaTest` tests with PostgreSQL plus real Flyway migrations
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
- [docs/guides/git-workflow.md](../../docs/guides/git-workflow.md)
- [.github/pull_request_template.md](../../.github/pull_request_template.md)
