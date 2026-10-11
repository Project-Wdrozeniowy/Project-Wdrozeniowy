# Naming conventions

These are approved conventions for new and changed work, not a claim that the
existing code has already been fully migrated. See the [architecture guide](architecture.md)
for placement and service boundaries. Cleanup that changes application code is
tracked separately in Jira.

## Universal

- Use English for identifiers, test names, branch names, commit subjects and
  PR metadata. Developer guides may use English or Polish, and temporarily
  Russian as described in the [guide index](README.md#language-and-maintenance).
- Use abbreviations only when their meaning is clear to the team. Do not
  invent ambiguous short forms for public names.
- In project-owned identifiers, treat acronyms as words: `JwtUtil`,
  `ApiClient`, `clientIp`, not `JWTUtil`, `APIClient`, `clientIP`. Preserve
  externally defined names at integration boundaries.

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

The DTO suffix table is the target convention. Existing outbound classes with
`Response` outside a generic wrapper must be reviewed by the backend owner;
do not rename a public Java type without updating serialization, OpenAPI,
tests, and its consumers. [PWDRZ-133](https://project-wdrz.atlassian.net/browse/PWDRZ-133)
owns the backend cleanup, not this documentation edit.

### Methods

- Repository method names follow Spring Data's query intent (`findBy*`,
  `existsBy*`, `deleteBy*`, `countBy*`) where those forms apply.
- Controller methods name the HTTP operation; service methods name the domain
  operation. They need not have identical names. Prefer clear action names
  over a fixed verb vocabulary.

### Variables

- `camelCase`
- Boolean fields and parameters read as predicates; `is`, `has`, `should`, or
  `can` are useful when natural, but not required for names such as `read`.
- Choose temporal type and suffix by meaning. `createdAt` is an instant;
  a calendar date or duration need not be `OffsetDateTime` or end in `At`.

### JPA / database

- Columns: `snake_case` (`password_hash`, `created_at`).
- Tables: plural `snake_case` (`users`, `refresh_tokens`).
- Postgres enums: `snake_case` type name, `UPPER_CASE` values
  (`user_role`, `USER`/`MODERATOR`/`ADMIN`).
- The target schema convention is `created_at` and `updated_at` on every
  table. For append-only rows, `updated_at` begins at creation and changes
  only if the row is updated. Existing tables do not all comply; add columns
  through a new Flyway migration and coordinate mappings/tests with the
  backend owner under [PWDRZ-134](https://project-wdrz.atlassian.net/browse/PWDRZ-134).
  Never edit an already-applied migration.
- Flyway files: `V{N}__short_description.sql` (e.g.
  `V2__create_forum_tables.sql`).

### Lombok

Choose Lombok annotations for the type's actual behaviour and verify JSON
binding for request/response DTOs. In particular, generated equality and
`toString` on JPA relationships need care; no single entity annotation recipe
is mandatory. Do not ban `@AllArgsConstructor` globally for requests without
a failing binding case. Constructor injection remains the default for services
and controllers. The backend owner reviews Java-specific choices.

## Frontend (TypeScript / React)

### Files

| Kind                 | Naming                |
| -------------------- | --------------------- |
| Page route           | `app/<route>/page.tsx`, `app/<route>/layout.tsx` |
| React component      | `PascalCase.tsx`      |
| Hook                 | `useThing.ts`         |
| Service / API client | `camelCase.ts` (e.g. `userService.ts`) |
| Store slice          | `camelCaseSlice.ts` under `store/slices/` |
| Shared type declarations | `src/shared/types/index.ts` (current entry point; new files may be introduced when ownership is clear) |
| Test                 | `__tests__/Thing.test.tsx`, sibling to source |

### Functions and variables

- React components: `PascalCase`.
- Hooks: `useThing` (must follow rules of hooks).
- Event handlers have no project-specific `on*` versus `handle*` naming rule;
  use a name that explains the callback or action in its context.
- Service helpers use an action plus a domain noun, such as `getUsers`,
  `createPost`, or `updateProfile`. `fetch*` is not reserved for hooks; use it
  when it accurately describes a network retrieval.
- Booleans read as predicates; `isOpen`, `hasError`, and `canEdit` are useful
  examples, not an exhaustive prefix list.
- Use `UPPER_SNAKE_CASE` for predefined values intended to stay fixed, such
  as `HOURS_IN_DAY` or `DAYS_OF_WEEK`. A runtime-derived value remains
  `camelCase` even if declared with `const`: `currentWeek`, `hoursLeft`,
  `clientIp`. `const` alone does not make an object deeply immutable.

### Types

- Prefer `interface` for project-owned object shapes and contracts. A `type`
  alias is suitable for unions, intersections, mapped types, and deliberately
  closed DTO shapes that are not intended to be extended as contracts.
  `type` does **not** make fields immutable; use `readonly` where needed.
- **No `I` prefix**. `User`, not `IUser`.
- Component props are named `<ComponentName>Props`, including local props
  shapes: `interface PostCardProps { … }`. Existing inline `Props` forms need
  [PWDRZ-132](https://project-wdrz.atlassian.net/browse/PWDRZ-132), not a
  documentation-only rename.
- Generic wrappers reused across resources: `PagedResponse<T>`, matching the
  backend's `PagedResponse`. API responses are not wrapped in an envelope.

### State (Zustand)

- One slice per cohesive shared client-state responsibility; split when
  unrelated state starts coupling. File name `<name>Slice.ts`, exported
  interface `<Name>Slice`, factory function `create<Name>Slice`.
- Actions inside a slice are camelCase verbs:
  setters use `set<Field>` (`setUser`, `setLoading`); domain actions use a
  plain verb (`logout`, `resetCart`).

### Imports

- Use the `@/*` alias for all cross-folder imports. Relative imports only
  inside the same folder.
- No additional project-specific import-order rule is imposed. Formatter and
  linter configuration remain the enforceable style source.

### Styling

- Use Tailwind utility classes; do not introduce CSS Modules in new code.
- Use `cn()` from `@/lib/cn` for conditional or long class lists. A short
  static `className` does not need a wrapper.

## Gateway (TypeScript / Node)

### Files and folders

- Use `PascalCase` for classes/constructors and `camelCase.ts` for other files.
- Middleware filenames describe what they do: `auth.ts`, `logger.ts`,
  `rateLimiter.ts`, `errorHandler.ts`.
- Route filenames describe the responsibility they actually own. The current
  proxy uses `routes/proxy.ts` and `routes/wsProxy.ts`; no resource-route
  filename is prescribed before such a split exists.

### Functions

- Use named exports for gateway modules, including middleware and proxy
  functions (`authMiddleware`, `errorHandler`, `proxyMiddleware`). Existing
  default exports require a separate migration of imports and tests under
  [PWDRZ-136](https://project-wdrz.atlassian.net/browse/PWDRZ-136).
- Express handlers: `(req, res, next) => …` typed with Express's
  `Request` / `Response` / `NextFunction`.

### Configuration

- All env access goes through a single `config/` module that validates
  required variables on startup. Code outside `config/` never reads
  `process.env`.

## Pull request / branch naming

The [Git workflow](git-workflow.md) owns branch, commit, and PR naming rules.
