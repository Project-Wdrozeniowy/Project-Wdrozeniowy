# Naming conventions

The rules below are the ones already followed in the codebase. Anything new
should match. When in doubt, prefer the convention that produces grep-friendly
identifiers.

## Universal

- **English only** in code, comments, commit messages, branch names and PR
  titles. Localised user-facing strings live in resource bundles / i18n files,
  not in identifiers.
- **No abbreviations** that aren't industry standard (`Repo`, `Mgr`, `Svc` are
  banned; `DTO`, `JWT`, `URL`, `JSON` are fine).
- **Acronyms are PascalCase**, not UPPERCASE — `JwtUtil`, not `JWTUtil`;
  `ApiClient`, not `APIClient`.

## Backend (Java)

### Packages

Lowercase, single word per segment, grouped by **bounded context** then by
**layer**:

```
com.devpulse.<context>.<layer>
com.devpulse.forum.service.PostService
com.devpulse.auth.repository.UserRepository
```

### Classes

| Kind            | Suffix         | Example                |
| --------------- | -------------- | ---------------------- |
| Entity          | _none_         | `User`, `Post`         |
| Enum            | _none_ (NOUN)  | `Role`, `PostStatus`   |
| Repository      | `Repository`   | `PostRepository`       |
| Service         | `Service`      | `PostService`          |
| Service impl    | `*Impl`        | `UserDetailsServiceImpl` (only when an interface exists) |
| Controller      | `Controller`   | `PostController`       |
| Spring config   | `Config`       | `SecurityConfig`       |
| Filter          | `Filter`       | `JwtAuthenticationFilter` |
| Utility         | `Util`         | `JwtUtil`, `SlugUtil`  |
| DTO — inbound   | `Request`      | `CreatePostRequest`    |
| DTO — outbound  | `Dto`          | `PostDto`, `UserProfileDto` |
| DTO — listing   | `SummaryDto`   | `PostSummaryDto`, `UserSummaryDto` |
| Generic wrapper | `Response`     | `PagedResponse<T>`, `AuthResponse` |
| Exception       | `Exception`    | `AppException`         |
| Exception advice| `Handler`      | `GlobalExceptionHandler` |
| Test            | `Test`         | `PostServiceTest`      |

### Methods

| Layer        | Verb conventions                                          |
| ------------ | --------------------------------------------------------- |
| Repository   | Spring Data derivation: `findBy*`, `existsBy*`, `deleteBy*`, `countBy*`. Custom queries use `@Query` with the same name shape. |
| Service      | One verb + noun phrase. Standard verbs: `create`, `update`, `delete` (or `softDelete`), `getById`, `getBySlug`, `search`, `revokeAllActiveByUser`, ... Avoid `do*`, `handle*`. |
| Controller   | Match the HTTP verb intent: `create`, `update`, `delete`, `getById`, `search`. The method should usually delegate to a service method of the same name. |

### Variables

- `camelCase`
- Boolean fields and parameters prefixed with `is`, `has`, `should`, `can`.
- Time-related fields use `OffsetDateTime` and the suffix `At`:
  `createdAt`, `updatedAt`, `expiresAt`, `revokedAt`.

### JPA / database

- Columns: `snake_case` (`password_hash`, `created_at`).
- Tables: plural `snake_case` (`users`, `refresh_tokens`).
- Postgres enums: `snake_case` type name, `UPPER_CASE` values
  (`user_role`, `USER`/`MODERATOR`/`ADMIN`).
- Audit columns are always `created_at` (immutable) and `updated_at`
  (auto-managed). Use Hibernate `@CreationTimestamp` / `@UpdateTimestamp`.
- Flyway files: `V{N}__short_description.sql` (e.g.
  `V2__create_forum_tables.sql`).

### Lombok

- Entities: `@Builder @NoArgsConstructor @AllArgsConstructor` plus `@Data`, or
  `@Getter @Setter` when the entity has collections or bidirectional
  associations (generated `equals`/`hashCode`/`toString` would walk them).
- Response DTOs: `@Getter @Builder` (`@SuperBuilder` when one extends another)
  with a static `from(entity)` factory.
- Request DTOs: `@Data @NoArgsConstructor`, **without** `@AllArgsConstructor`.
  Jackson 3 would deserialize through the all-args constructor and fail on a
  missing primitive field.
- `@RequiredArgsConstructor` on services/controllers (`final` field injection
  — no `@Autowired`).
- `@Slf4j` for loggers in new code.

## Frontend (TypeScript / React)

### Files

| Kind                 | Naming                |
| -------------------- | --------------------- |
| Page route           | `app/<route>/page.tsx`, `app/<route>/layout.tsx` |
| React component      | `PascalCase.tsx`      |
| Hook                 | `useThing.ts`         |
| Service / API client | `camelCase.ts` (e.g. `userService.ts`) |
| Store slice          | `camelCaseSlice.ts` under `store/slices/` |
| Type declarations    | `src/shared/types/index.ts` (single entry)  |
| Test                 | `__tests__/Thing.test.tsx`, sibling to source |

### Functions and variables

- React components: `PascalCase`.
- Hooks: `useThing` (must follow rules of hooks).
- Event handlers passed as props: `onAction` (`onClick`, `onSubmit`).
  Event handlers defined inside a component: `handleAction`
  (`handleSubmit`, `handleClose`).
- Async API helpers in services: verb-first, lowercase verb, plural for
  collections: `getUsers`, `createPost`, `updateProfile`, `deletePost`.
  Reserve `fetch*` for hooks that internally call the service.
- Booleans: `isOpen`, `hasError`, `canEdit`, `shouldRedirect`.
- Constants: `UPPER_SNAKE_CASE` only for truly immutable, exported values
  (HTTP status codes, route keys). Otherwise `camelCase`.

### Types

- `interface` for shapes the app **owns** and may extend.
- `type` for unions, intersections and mapped types.
- **No `I` prefix**. `User`, not `IUser`.
- Component props named `<ComponentName>Props`:
  `interface PostCardProps { … }`.
- Generic wrappers reused across resources: `PagedResponse<T>`, matching the
  backend's `PagedResponse`. API responses are not wrapped in an envelope.

### State (Zustand)

- One slice per bounded concern. File name `<name>Slice.ts`, exported
  interface `<Name>Slice`, factory function `create<Name>Slice`.
- Actions inside a slice are camelCase verbs:
  setters use `set<Field>` (`setUser`, `setLoading`); domain actions use a
  plain verb (`logout`, `resetCart`).

### Imports

- Use the `@/*` alias for all cross-folder imports. Relative imports only
  inside the same folder.
- Import order (recommended convention — not currently enforced by an ESLint
  rule): external packages → `@/*` imports → relative imports → type-only
  imports last (`import type { … } from …`).

### Styling

- Tailwind utility classes inline. No CSS modules.
- Conditional or long class lists go through `cn()` from `@/lib/cn` (a thin
  wrapper around `clsx`).

## Gateway (TypeScript / Node)

### Files and folders

- Same casing rules as the frontend: `PascalCase` is reserved for classes /
  constructors (rare here); everything else is `camelCase.ts`.
- Middleware filenames describe what they do: `auth.ts`, `logger.ts`,
  `rateLimiter.ts`, `errorHandler.ts`.
- Route files: today the gateway is a thin proxy with a single
  `routes/proxy.ts`. Once routes are split per resource, name each file
  after the resource it owns: `postsRoutes.ts`, `authRoutes.ts`.

### Functions

- Middleware modules default-export the middleware, named after what it does
  (`authMiddleware`, `corsMiddleware`, `rateLimiter`, `errorHandler`).
- Proxies: `proxyMiddleware`, `wsProxyMiddleware`.
- Express handlers: `(req, res, next) => …` typed with Express's
  `Request` / `Response` / `NextFunction`.

### Configuration

- All env access goes through a single `config/` module that validates
  required variables on startup. Code outside `config/` never reads
  `process.env`.

## Pull request / branch naming

See [git-workflow.md](./git-workflow.md). Quick summary:

- Branch: `type/PWDRZ-XX-short-description` (`feature`, `bugfix`, `hotfix`, `docs`)
- Commit & PR title: `[PWDRZ-XX]: Short imperative summary`
