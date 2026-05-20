# Codebase Integration Report

> Analyzed assuming the codebase was built by multiple developers working independently without
> strong leadership, code reviews, or architectural alignment.
>
> Evidence sources: source files read directly; no assumptions made.

---

## 1. 🔴 Critical Connection Breaks (Frontend/Backend Mismatch)

### 1.1 Auth response shape mismatch — login and register will silently fail

**Severity:** The frontend destructures fields from the response that the backend never sends.
Every login and register call will throw at runtime when it tries to read `undefined` properties.

**Backend returns** (`AuthController` → `AuthResponse.java`):
```json
{
  "accessToken":  "eyJ...",
  "refreshToken": "a1b2c3...",
  "tokenType":    "Bearer",
  "expiresIn":    900
}
```

**Frontend expects** (destructured in `login/page.tsx` line 35, `register/page.tsx` line 43):
```ts
const { user, token, refreshToken } = response.data;
```

The frontend type (`frontend/src/shared/types/index.ts`) declares:
```ts
export interface AuthResponse {
  user: User;    // ← backend never sends this
  token: string; // ← backend sends "accessToken", not "token"
  refreshToken?: string;
}
```

Mismatch table:

| Frontend expects | Backend sends | Result |
|---|---|---|
| `response.data.user` | *(not present)* | `user` is `undefined`; `setUser` call passes `undefined` |
| `response.data.token` | `response.accessToken` | token is never stored; every subsequent request sends no Bearer header |
| `response.data.refreshToken` | `response.refreshToken` | name matches but lives at wrong nesting level |

**Files:**
- `frontend/src/shared/types/index.ts` — `AuthResponse` interface
- `frontend/src/services/authService.ts` — wraps call in `ApiResponse<AuthResponse>`
- `frontend/src/app/(auth)/login/page.tsx` line 35
- `frontend/src/app/(auth)/register/page.tsx` line 43
- `backend/src/main/java/com/devpulse/auth/dto/AuthResponse.java`

---

### 1.2 Response envelope mismatch — backend sends flat JSON, frontend expects a wrapper

The frontend `authService` wraps all auth calls in `ApiResponse<T>`:
```ts
// frontend/src/services/authService.ts
apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data)
```

`ApiResponse<T>` is defined as:
```ts
interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
  success: boolean;
}
```

The backend `AuthController` returns the `AuthResponse` DTO directly — there is no envelope:
```java
public AuthResponse login(@Valid @RequestBody AuthRequest request) {
    return authService.login(request);
}
```

The response body is `{ accessToken, refreshToken, tokenType, expiresIn }`, not
`{ data: {...}, message: "...", status: 200, success: true }`.

Reading `response.data` on the Axios response gives the raw DTO; reading `response.data.data`
gives `undefined`. The destructure in login/register pages goes one level too deep.

**Files:**
- `frontend/src/shared/types/index.ts` — `ApiResponse` wrapper type
- `frontend/src/services/authService.ts`
- `backend/src/main/java/com/devpulse/auth/controller/AuthController.java`

---

### 1.3 Login request field mismatch — frontend sends `email`, backend expects `username`

**Frontend login form** (`frontend/src/lib/validations/auth.ts`):
```ts
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
```

The form collects `{ email, password }` and passes it directly to `authService.login(data)`.

**Backend `AuthRequest` DTO** (`backend/src/main/java/com/devpulse/auth/dto/AuthRequest.java`):
```java
@NotBlank private String username;
@NotBlank private String password;
```

The backend expects `{ username, password }`. Sending `{ email, password }` means `username`
fails `@NotBlank` validation and the endpoint returns HTTP 400 on every login attempt.

**Files:**
- `frontend/src/lib/validations/auth.ts` — `loginSchema`
- `frontend/src/app/(auth)/login/page.tsx` — form field labeled "Email"
- `backend/src/main/java/com/devpulse/auth/dto/AuthRequest.java`

---

### 1.4 Register request sends `displayName` and `interests` — backend ignores them

**Frontend register call** (`frontend/src/app/(auth)/register/page.tsx`):
```ts
authService.register({
  username: data.username,
  email: data.email,
  password: data.password,
  displayName: data.displayName,  // ← extra field
  interests: data.interests,      // ← extra field
});
```

**Backend `RegisterRequest` DTO** (`backend/src/main/java/com/devpulse/auth/dto/RegisterRequest.java`):
```java
@NotBlank @Size(min = 3, max = 50) private String username;
@NotBlank @Email @Size(max = 100)  private String email;
@NotBlank @Size(min = 8, max = 128) private String password;
```

`displayName` and `interests` are silently discarded by Jackson. The database schema
(`V1__create_users.sql`) has a `display_name` column, but the `User` entity
(`auth/entity/User.java`) does not map it — the column exists in the DB but is never written.

**Files:**
- `frontend/src/app/(auth)/register/page.tsx`
- `frontend/src/lib/validations/auth.ts` — `RegisterRequest` type
- `backend/src/main/java/com/devpulse/auth/dto/RegisterRequest.java`
- `backend/src/main/java/com/devpulse/auth/entity/User.java`
- `backend/src/main/resources/db/migration/V1__create_users.sql`

---

### 1.5 `POST /api/auth/logout` is called by frontend — endpoint does not exist in backend

**Frontend:**
```ts
// frontend/src/services/authService.ts
logout: (): Promise<ApiResponse<null>> => apiClient.post<ApiResponse<null>>('/auth/logout'),
```

Called from `frontend/src/components/layout/Header.tsx`:
```ts
authService.logout().catch(() => {});
```

**Backend:** There is no `@PostMapping("/logout")` in `AuthController.java`. A search across
all backend Java files returns zero matches for "logout". The gateway public route list does not
include `/api/auth/logout`, so the request will be stopped by `authMiddleware` with 401 if the
user is not authenticated, or proxied to the backend and met with a Spring 404 if they are.

The `.catch(() => {})` silences the error, so the user's local state is cleared but the server
never invalidates the refresh token stored in the database.

**Files:**
- `frontend/src/services/authService.ts`
- `frontend/src/components/layout/Header.tsx`
- `backend/src/main/java/com/devpulse/auth/controller/AuthController.java` — no logout endpoint
- `gateway/src/config/index.ts` — `publicRoutes` list does not include logout

---

### 1.6 `userService` calls five endpoints — none exist in the backend

**Frontend** (`frontend/src/services/userService.ts`) defines:
```ts
getUsers:  GET  /users
getUser:   GET  /users/:id
createUser: POST /users
updateUser: PATCH /users/:id
deleteUser: DELETE /users/:id
```

There is no `UserController` in the backend. No `@RestController` or `@RequestMapping("/users")`
exists anywhere under `backend/src/main/java/`. These calls will receive a Spring 404 or a
gateway 502.

The `userService` methods are imported and type-checked but whether they are actually invoked
from pages is unclear — no page component was found calling `userService` directly (the
`Header.tsx` reads from the Zustand store, not from `userService`). However, the service is
exported and any developer may call it assuming it works.

**Files:**
- `frontend/src/services/userService.ts`
- `backend/src/main/java/com/devpulse/` — no UserController class

---

## 2. 🟡 Partial Implementations (One Side Only)

### 2.1 Forum UI exists — no backend API

The forum feature has a complete frontend:
- `frontend/src/app/(main)/forum/page.tsx` — post list with category filter
- `frontend/src/app/(main)/forum/[postId]/page.tsx` — post detail page (skeleton UI)
- `frontend/src/app/_components/PostCard.tsx` — card with local vote state
- `frontend/src/hooks/usePosts.ts` — React Query hook

All data comes from `frontend/src/services/forumService.ts` which returns hardcoded
`MOCK_POSTS` constants and has a comment:
```ts
// TODO: replace with real API call when backend is ready
```

The backend has the full database schema (`V2__create_forum_tables.sql` — posts, comments,
tags, tag assignments, votes) but zero Java code for any forum endpoint. No controller,
service, repository, entity, or DTO exists for posts, comments, or votes.

The `PostCard` vote buttons (`VoteButton.tsx`) update local React state only — no API call is
made on vote.

**Files:**
- `frontend/src/services/forumService.ts`
- `frontend/src/constants/posts.ts` — `MOCK_POSTS` static data
- `backend/src/main/resources/db/migration/V2__create_forum_tables.sql` — schema exists
- `backend/src/main/java/com/devpulse/` — no forum package

---

### 2.2 Dashboard page is entirely static

`frontend/src/app/(main)/dashboard/page.tsx` renders analytics charts using only constants:
```ts
import { STATS, ENGAGEMENT_PER_MONTH, ACTIVITY_BY_HOUR, MONTHS } from '@/constants/dashboard';
import { POSTS_PER_MONTH, POSTS_BY_TOPIC } from '@/constants/posts';
```

The backend has `V4__create_analytics_tables.sql` with an `activity_events` table, but no
analytics controller, service, or repository exists in Java. No API call is made from the
dashboard page.

**Files:**
- `frontend/src/app/(main)/dashboard/page.tsx`
- `frontend/src/constants/dashboard.ts`
- `backend/src/main/resources/db/migration/V4__create_analytics_tables.sql`

---

### 2.3 Profile page is entirely static skeleton

`frontend/src/app/(main)/profile/page.tsx` renders three components:
- `ProfileCard` — hardcoded "JD" initials and animated placeholder divs; no user data
- `ProfileTabs` — tab UI only
- `PostsSkeleton` — permanent loading skeleton, never resolves

No API call is made. `userService.getUser()` is never called. The user object from the
Zustand store is not read in this page.

**Files:**
- `frontend/src/app/(main)/profile/page.tsx`
- `frontend/src/app/(main)/profile/_components/ProfileCard.tsx`

---

### 2.4 Notifications schema exists in DB — no backend or frontend implementation

`V3__create_notifications.sql` creates a `notifications` table and a `post_subscriptions`
table. Neither has a corresponding Java entity, repository, service, or controller. The
frontend `shared/types/index.ts` defines a `Notification` interface and a
`PostSubscription` interface, but no service or UI component uses them.

**Files:**
- `backend/src/main/resources/db/migration/V3__create_notifications.sql`
- `frontend/src/shared/types/index.ts` — `Notification`, `PostSubscription` types
- `backend/src/main/java/com/devpulse/` — no notifications package
- `frontend/src/services/` — no notifications service

---

### 2.5 `authGuard` middleware is fully implemented but never registered

`gateway/src/middleware/authGuard.ts` implements route-level redirect logic (unauthenticated
users → `/login`, logged-in users away from `/login` → `/`). It reads an `orbita_session`
cookie set by `tokenStorage.setTokens()` in `authService.ts`.

The function is **never imported or used** in `gateway/src/app.ts`. The middleware is dead
code — it has no effect on any request.

Note: this middleware guards page routes (`/forum`, `/dashboard`, etc.), not API routes.
It makes sense only if the gateway also serves the Next.js frontend, which it does not in the
current architecture. The frontend is a separate service on port 3001.

**Files:**
- `gateway/src/middleware/authGuard.ts` — complete implementation, never imported
- `gateway/src/app.ts` — does not import authGuard
- `gateway/jest.config.js` — explicitly excluded from coverage (`!src/middleware/authGuard.ts`)

---

### 2.6 Sort tabs (Hot / New / Top) on home page — no sorting logic

`frontend/src/app/(main)/page.tsx` renders three sort tabs (Hot, New, Top) with an
`activeTab` state. The `usePosts()` hook is called once unconditionally. `activeTab` is never
passed to `fetchPosts()` — the displayed list is identical regardless of which tab is active.

**Files:**
- `frontend/src/app/(main)/page.tsx`
- `frontend/src/hooks/usePosts.ts`
- `frontend/src/services/forumService.ts`

---

### 2.7 "Forgot Password" link points to a non-existent page

`frontend/src/app/(auth)/login/page.tsx` renders:
```tsx
<Link href="/forgot-password" ...>Forgot password?</Link>
```

No `forgot-password` page exists anywhere under `frontend/src/app/`. Navigation will produce
a Next.js 404. No backend endpoint for password reset exists either.

**Files:**
- `frontend/src/app/(auth)/login/page.tsx`
- `frontend/src/app/(auth)/` — no `forgot-password` directory

---

### 2.8 OAuth buttons (Google, GitHub, Discord) in login form — no implementation

`frontend/src/app/(auth)/login/page.tsx` renders three OAuth provider buttons. Clicking them
does nothing — no `onClick` handler is attached beyond the default `type="button"`. No backend
OAuth endpoints exist.

**Files:**
- `frontend/src/app/(auth)/login/page.tsx`

---

## 3. 🔵 Duplication and Inconsistency

### 3.1 Two conflicting `AuthResponse` type definitions

The frontend has two separate definitions of what an auth response looks like:

**`frontend/src/shared/types/index.ts`:**
```ts
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}
```

**`frontend/src/services/authService.ts`** imports this type and passes it to the HTTP
client. But the `authSlice.ts` `setUser` signature expects `(user, token, refreshToken)`,
matching the types definition.

The backend `AuthResponse` is a third, incompatible definition with `accessToken`, `tokenType`,
`expiresIn`. Three different models for the same concept exist across three files, with no
shared source of truth.

**Files:**
- `frontend/src/shared/types/index.ts`
- `frontend/src/services/authService.ts`
- `backend/src/main/java/com/devpulse/auth/dto/AuthResponse.java`

---

### 3.2 `MockPost` type vs `Post` type — two unrelated post models

`frontend/src/constants/posts.ts` defines `MockPost`:
```ts
export interface MockPost {
  id: string; username: string; userInitial: string; timeAgo: string;
  badge: string | null; category: Topic; title: string; excerpt: string;
  votes: number; comments: number;
}
```

`frontend/src/shared/types/index.ts` defines a fully-fledged `Post`:
```ts
export interface Post {
  id: string; userId: string; categoryId: string; title: string; slug: string;
  content: string; status: PostStatus; isPinned: boolean; viewCount: number;
  voteScore: number; commentCount: number; lastActivityAt: string; createdAt: string;
  updatedAt: string; author?: User; category?: Category; tags?: Tag[];
}
```

`PostCard.tsx` accepts `MockPost`. The real `Post` type is never rendered anywhere.
When the backend forum API is eventually implemented and returns `Post`-shaped data,
every component that uses `MockPost` will need to be rewritten.

**Files:**
- `frontend/src/constants/posts.ts` — `MockPost`
- `frontend/src/shared/types/index.ts` — `Post`
- `frontend/src/app/_components/PostCard.tsx` — renders `MockPost`

---

### 3.3 `RegisterData` type in `shared/types` does not match `RegisterFormData` in validations

`frontend/src/shared/types/index.ts` declares:
```ts
export interface RegisterData {
  username: string; email: string; password: string;
  displayName: string; interests?: CategoryKey[];
}
```

`frontend/src/lib/validations/auth.ts` derives `RegisterFormData` from Zod and includes
`confirmPassword` and `terms` fields that `RegisterData` does not have. The two types are
parallel definitions of the same concept maintained in different places.

`authService.register` uses `Omit<RegisterFormData, 'confirmPassword' | 'terms'>`, which
is structurally equivalent to `RegisterData` — but `RegisterData` is not used anywhere.
It is a dead type.

**Files:**
- `frontend/src/shared/types/index.ts` — `RegisterData` (unused)
- `frontend/src/lib/validations/auth.ts` — `RegisterFormData` (used)
- `frontend/src/services/authService.ts`

---

### 3.4 `LoginCredentials` type in `shared/types` is never used

`frontend/src/shared/types/index.ts` declares:
```ts
export interface LoginCredentials {
  email: string;
  password: string;
}
```

`authService.login` accepts `LoginFormData` (from Zod), not `LoginCredentials`. The type is
not imported or referenced anywhere.

**File:** `frontend/src/shared/types/index.ts`

---

### 3.5 `display_name` column exists in DB but is not mapped in the `User` entity

`V1__create_users.sql` creates column `display_name VARCHAR(100)`. The backend `User.java`
entity has no `displayName` field. The column is never read or written by the application.
Frontend `RegisterFormData` collects a `displayName` value, the register endpoint receives
it, Jackson deserializes it — then it is discarded because `RegisterRequest.java` has no
`displayName` field and `User.java` has no mapping for it.

**Files:**
- `backend/src/main/resources/db/migration/V1__create_users.sql`
- `backend/src/main/java/com/devpulse/auth/entity/User.java`
- `backend/src/main/java/com/devpulse/auth/dto/RegisterRequest.java`

---

### 3.6 `User` status and role enums differ between frontend and backend/DB

| Layer | Role values | Status values |
|---|---|---|
| DB (`V1__create_users.sql`) | `USER, MODERATOR, ADMIN` | `ACTIVE, BANNED, DEACTIVATED` |
| Backend `Role.java` | `USER, ADMIN` | *(no status enum)* |
| Frontend `shared/types` | `'user', 'admin', 'moderator'` | `'active', 'banned', 'suspended'` |

- Backend `Role` enum has no `MODERATOR` value, but the DB schema does.
- Frontend uses lowercase strings; backend uses uppercase `EnumType.STRING`.
- Frontend `UserStatus` has `'suspended'`; DB has `DEACTIVATED`. These will never match.

**Files:**
- `backend/src/main/java/com/devpulse/auth/entity/Role.java`
- `backend/src/main/resources/db/migration/V1__create_users.sql`
- `frontend/src/shared/types/index.ts`

---

### 3.7 `.prettierrc` files differ between frontend and gateway

`frontend/.prettierrc` and `gateway/.prettierrc` are maintained separately. The gateway
additionally has a `gateway/.prettierrc.json` (two config files for the same tool in the
same directory). Both services claim the same settings per `AGENTS.md`, but any drift will
go unnoticed because there is no root-level shared Prettier config.

**Files:**
- `frontend/.prettierrc`
- `gateway/.prettierrc`
- `gateway/.prettierrc.json`

---

### 3.8 `Category` type defined in `shared/types` vs `Topic` enum in `constants/categories`

`frontend/src/shared/types/index.ts` defines:
```ts
export interface Category { id: string; name: string; slug: string; ... }
```

`frontend/src/constants/categories.ts` defines a `Topic` enum used in `MockPost`. The
`Category` interface is never instantiated or fetched — all category logic uses the local
`Topic` enum. When real category data comes from the backend, there will be a structural
conflict between the two representations.

**Files:**
- `frontend/src/shared/types/index.ts` — `Category` interface
- `frontend/src/constants/categories.ts` — `Topic` enum

---

## 4. ✅ What Is Working and Connected End-to-End

### 4.1 Gateway JWT auth middleware is correctly wired

`gateway/src/app.ts` registers `authMiddleware` on `app.use('/api', ...)` before the proxy.
`gateway/src/config/index.ts` correctly marks `POST /api/auth/login` and
`POST /api/auth/register` as public routes. Token extraction, `jwt.verify` with HS256, and
error responses (401 with distinct messages for missing token, expired token, invalid token)
are all implemented and tested.

**Files:** `gateway/src/app.ts`, `gateway/src/middleware/auth.ts`, `gateway/src/config/index.ts`

---

### 4.2 Backend auth endpoints are structurally sound

`POST /auth/register`, `POST /auth/login`, and `POST /auth/refresh` are all implemented with
Bean Validation, BCrypt hashing, single active refresh token strategy, and RFC 9457
`ProblemDetail` error responses. Unit tests exist for `AuthService`, `AuthController`,
`JwtUtil`, `JwtAuthenticationFilter`, and `UserDetailsServiceImpl`.

**Files:** `backend/src/main/java/com/devpulse/auth/`

---

### 4.3 `ApiClient` interceptors are correctly configured

`frontend/src/services/api.ts` attaches the Bearer token from `localStorage` on every
request and redirects to `/login` on 401. Timeout (10 s) and base URL resolution
(env var → relative `/api` → localhost fallback) are all handled.

**File:** `frontend/src/services/api.ts`

---

### 4.4 Frontend form validation is thorough

Both login and register forms use Zod schemas with `zodResolver`. Field-level errors are
displayed inline. `confirmPassword` cross-validation, username regex, and password complexity
rules are all enforced on the client before any network request is made.

**Files:** `frontend/src/lib/validations/auth.ts`, `frontend/src/app/(auth)/login/page.tsx`,
`frontend/src/app/(auth)/register/page.tsx`

---

### 4.5 Zustand store initialises from `localStorage` on mount

`authSlice.ts` reads `token` and `refreshToken` from `tokenStorage` at slice creation, so
the auth state survives page refreshes without requiring a network call.

**File:** `frontend/src/store/slices/authSlice.ts`

---

### 4.6 Gateway proxy passes all `/api/*` traffic to backend

`gateway/src/routes/proxy.ts` uses `http-proxy-middleware` with `pathFilter: '/api'`
targeting `BACKEND_URL`. The proxy error handler returns a structured `{ error }` JSON on
backend unavailability rather than crashing.

**File:** `gateway/src/routes/proxy.ts`

---

### 4.7 Flyway migrations are in place and in order

Four versioned migrations (`V1`–`V4`) cover users/refresh tokens, forum tables (posts,
comments, tags, votes), notifications/subscriptions, and analytics events. They are immutable
(no edits found). The backend test config (`application-test.properties`) disables Flyway,
preventing migration conflicts in unit tests.

**Files:** `backend/src/main/resources/db/migration/`

---

## Summary

The gateway and backend auth layer are the most complete and internally consistent parts of
the codebase. Everything beyond registration and login is either mocked, skeletal, or broken
at the integration boundary.

The single most damaging issue is **§1.1–§1.3 combined**: even the one implemented feature
(auth) will not work end-to-end because the response shape, response envelope, and login
field name all mismatch between frontend and backend. A user cannot successfully log in.

### [ASK USER] Questions

1. **§1.3** — Should login use `email` or `username`? The frontend form and Zod schema use
   `email`; the backend DTO and Spring Security `UserDetailsService` use `username`. Which is
   the intended credential?

2. **§1.1 / §1.2** — Should the backend wrap all responses in `{ data, message, status, success }`
   or should the frontend unwrap the raw DTO? Picking one side determines whether
   `GlobalExceptionHandler` also needs to return the same envelope for errors.

3. **§1.4 / §3.5** — Is `displayName` a required field for registration? It exists in the DB
   schema and the frontend form, but is missing from `RegisterRequest.java` and the `User`
   entity.

4. **§2.5** — Is `authGuard.ts` intended for a future SSR/BFF mode where the gateway also
   serves pages? If not, it should be deleted.

5. **§3.6** — Which role set is canonical: `USER/ADMIN` (backend enum) or
   `USER/MODERATOR/ADMIN` (DB and frontend)? The backend enum needs a `MODERATOR` value or
   the DB migration and frontend types need to be reduced.

6. **§3.2** — When the forum API is implemented, should `PostCard` be rewritten to consume
   the `Post` type from `shared/types`, or should `MockPost` be expanded to match?
