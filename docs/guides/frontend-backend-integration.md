# Frontend ↔ Backend integration guide

This is a cheat sheet for wiring the frontend (`frontend/src/services/*` +
`frontend/src/types`) to the real backend after PRs #19–#23 land. As of
today the contracts disagree in six places — this document lists exactly
what's broken and how to fix it. All fixes live on the frontend; the
backend has already shipped these shapes and changing it now is more
expensive.

**Implementation status today:** only the auth endpoints — `register`,
`login`, `refresh`, and `logout` — actually run real code. Everything
else described in this guide (`/forum/posts`, `/forum/categories`,
`/forum/comments`, `/forum/tags`, `/forum/votes`, and both
`GET`/`PATCH /users/me`) is a controller stub that immediately throws
`501 NOT_IMPLEMENTED`. The shapes below (paths, DTOs, status codes) are
the real, merged contract — build the frontend against them — but don't
expect these non-auth calls to return data yet.

The frontend talks to the gateway, which proxies to the backend, so the
paths below are all relative to `/api`.

---

## 1. There is no `ApiResponse<T>` envelope on the backend

**Today:** [frontend/src/types/index.ts:3](../../frontend/src/types/index.ts)
defines `ApiResponse<T> = { data, message, status, success }`, and every
service returns `Promise<ApiResponse<T>>`.

**Reality:** the backend returns the DTO **directly**. There is no
`{ data, success }` wrapper. The axios `response.data` is already the
payload.

**Action:**
- Delete `ApiResponse`, or keep it as a legacy-only marker.
- Change service signatures to return the DTO directly:

```ts
// before
login: (data): Promise<ApiResponse<AuthResponse>> =>
  apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data),

// after
login: (data: LoginRequest): Promise<AuthResponse> =>
  apiClient.post<AuthResponse>('/auth/login', data),
```

- HTTP errors are thrown by axios anyway (interceptor in
  [api.ts:52](../../frontend/src/services/api.ts)). `success` is not needed.

---

## 2. Auth: tokens and login

### 2.1 `AuthResponse` has different fields

**Backend returns:**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "a1b2c3...",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

There is **no `user`** in the response. Fetch the profile with a separate
`GET /users/me` call after login.

**Update `frontend/src/types/index.ts`:**
```ts
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}
```

In [authService.ts](../../frontend/src/services/authService.ts) rename
`token → accessToken` everywhere it is read (`tokenStorage.setTokens`, the
request interceptor in [api.ts:43](../../frontend/src/services/api.ts)
that calls `localStorage.getItem('token')` — the storage key can stay,
but the value comes from `accessToken`).

After `login`/`register`, make the follow-up call:
```ts
const auth = await authService.login(creds);
tokenStorage.setTokens(auth.accessToken, auth.refreshToken);
const me = await userService.getMe();
authStore.setUser(me);
```

### 2.2 Login fields — already fixed

This used to be a mismatch: the backend `AuthRequest` is
`{ username, password }`, while
[lib/validations/auth.ts](../../frontend/src/lib/validations/auth.ts)
defined the login form as `{ email, password }`. That's been resolved —
`loginSchema` in that file is now `{ username, password }`, matching the
backend exactly. No action needed here anymore.

### 2.3 Register silently drops `displayName` and `interests`

The backend `RegisterRequest` accepts only `username, email, password`.
Jackson ignores extra fields, so the user is registered but `displayName`
ends up empty.

**Action:** right after `register`, call `PATCH /users/me` with
`displayName`:
```ts
const auth = await authService.register({ username, email, password });
tokenStorage.setTokens(auth.accessToken, auth.refreshToken);
await userService.updateMe({ displayName });
```

`interests` does not exist on the backend yet — either drop it from the
form or stash it in `localStorage` until the endpoint ships.

### 2.4 Logout needs a body with `refreshToken`

The frontend currently sends an empty POST. The backend expects
`{ refreshToken }` and returns 400 otherwise.

```ts
logout: (): Promise<void> => {
  const refreshToken = tokenStorage.getRefreshToken();
  return apiClient.post<void>('/auth/logout', { refreshToken });
},
```

### 2.5 Refresh

The backend does **not** rotate the refresh token today. `AuthService.refresh()`
looks up the raw refresh token, checks it hasn't expired, and returns a
**new access token paired with the same raw refresh token** you sent in —
nothing changes in storage on refresh. There is also no reuse-detection:
an old refresh token simply stays valid until it expires or is revoked
via `/auth/logout`.

A 401 from `/auth/refresh` just means the token wasn't found or has
expired — redirect to `/login` in that case. Rotation and
reuse-detection are a backend follow-up, not shipped behavior — don't
write frontend logic that assumes the refresh token changes on refresh.

---

## 3. User profile: routes and enum casing

### 3.1 Routes

[userService.ts](../../frontend/src/services/userService.ts) currently
exposes generic CRUD over `/users/:id`. **That does not exist.**
Available endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/users/me` | full profile of the current user |
| PATCH | `/users/me` | update displayName/avatarUrl/bio |
| GET | `/users/{username}` | public profile (by username, not id!) |

There is no change-password endpoint on the backend today — no
`POST /users/me/password` or equivalent exists in `UserController`.
Don't add a client call for it; if the product needs it, that's a
backend follow-up.

`POST /users` and `DELETE /users/:id` do not exist for the frontend.
There is no `getUsers` (list) either.

Rewrite the service along these lines:
```ts
export const userService = {
  getMe: () => apiClient.get<ProfileResponse>('/users/me'),
  updateMe: (data: UpdateProfileRequest) => apiClient.patch<ProfileResponse>('/users/me', data),
  getPublicProfile: (username: string) =>
    apiClient.get<PublicProfileResponse>(`/users/${username}`),
};
```

### 3.2 Profile fields

`ProfileResponse` (for `/users/me`):
```ts
interface ProfileResponse {
  id: number;                  // ← number, not string!
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';        // ← UPPER_CASE
  status: 'ACTIVE' | 'BANNED' | 'DEACTIVATED'; // ← UPPER_CASE, and 'DEACTIVATED', not 'suspended'
  postCount: number;
  commentCount: number;
  createdAt: string;           // ISO OffsetDateTime
}
```

`PublicProfileResponse` (for `/users/{username}`) — the same shape minus
`role`, `status`.

**Not on the backend** (drop from the type): `emailVerifiedAt`,
`updatedAt`, `banReason`.

### 3.3 Enum casing — lower vs upper

The frontend types use lowercase for roles/statuses. The backend ships
`USER` / `ACTIVE` / `PUBLISHED`. Two options:

- (recommended) Switch the frontend literals to UPPER_CASE — simple and
  unambiguous.
- Or: normalise in one place (response interceptor or mapper function),
  but remember the reverse mapping on the way out.

---

## 4. Posts (after #22 and #23 merge)

### 4.1 Endpoints

| Method | Path | Who | Returns |
|---|---|---|---|
| GET | `/forum/posts?q=&categorySlug=&tag=&page=&size=&sort=` | anyone | `PagedResponse<PostSummaryResponse>` |
| GET | `/forum/posts/{slug}` | anyone | `PostResponse` |
| POST | `/forum/posts` | authenticated | `PostResponse` |
| PATCH | `/forum/posts/{slug}` | author / MOD / ADMIN | `PostResponse` |
| PATCH | `/forum/posts/{slug}/pin` | MOD / ADMIN | `PostResponse` (toggle pin) |
| DELETE | `/forum/posts/{slug}` | author / MOD / ADMIN | 204 (soft delete) |

Routing is slug-based throughout — there is no id-based `GET`/`PUT` for
a single post. List defaults: `size=20`, `sort=lastActivityAt` (allowed
values: `createdAt`, `voteScore`, `lastActivityAt`).

### 4.2 Types

```ts
interface AuthorSummary { id: number; username: string; }
interface CategorySummary { id: number; name: string; slug: string; }

interface PostResponse {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'LOCKED' | 'DELETED';   // ← UPPER_CASE
  pinned: boolean;
  viewCount: number;
  voteScore: number;
  commentCount: number;
  author: AuthorSummary;        // nested object, not a userId string
  category: CategorySummary | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

// PostSummaryResponse is the same, MINUS content and updatedAt (used in lists)

interface CreatePostRequest {
  title: string;            // 5..255
  content: string;          // 1..50000
  categoryId?: number | null;
}

interface UpdatePostRequest {
  title?: string;
  content?: string;
  categoryId?: number | null;
  clearCategory?: boolean;  // true → detach the category (null = "leave it alone")
}
```

### 4.3 Pagination — does NOT match `PaginatedResponse` on the frontend

The backend sends:
```ts
interface PagedResponse<T> {
  content: T[];          // ← not `data`
  page: number;
  size: number;          // ← not `pageSize`
  totalElements: number; // ← not `total`
  totalPages: number;
  first: boolean;
  last: boolean;
}
```

Update `PaginatedResponse` in
[frontend/src/types/index.ts](../../frontend/src/types/index.ts) to match
(or add `PagedResponse` next to it and use that one for posts).

### 4.4 Wiring up the UI

[forumService.ts](../../frontend/src/services/forumService.ts) currently
returns `MOCK_POSTS`. Replace with:
```ts
export const forumService = {
  list: (params: SearchParams) =>
    apiClient.get<PagedResponse<PostSummaryResponse>>('/forum/posts', { params }),
  getBySlug: (slug: string) => apiClient.get<PostResponse>(`/forum/posts/${slug}`),
  create: (data: CreatePostRequest) => apiClient.post<PostResponse>('/forum/posts', data),
  update: (slug: string, data: UpdatePostRequest) =>
    apiClient.patch<PostResponse>(`/forum/posts/${slug}`, data),
  togglePin: (slug: string) => apiClient.patch<PostResponse>(`/forum/posts/${slug}/pin`),
  remove: (slug: string) => apiClient.delete<void>(`/forum/posts/${slug}`),
};
```

Remember that `PostSummaryResponse` has **no `content`** — for previews
use `title` and other summary fields, and fetch the full body on click
via `getBySlug`.

---

## 5. Roles & authorization (PR #19)

- Available roles: `USER`, `MODERATOR`, `ADMIN`.
- Admin-only smoke route: `GET /admin/ping` → 200
  `{ "status": "ok", "scope": "admin" }`. Handy in a route guard to
  verify "am I really an admin".
- The backend returns **RFC 9457 ProblemDetail** for 401/403:
  ```json
  { "type": "...", "title": "Forbidden", "status": 403, "detail": "..." }
  ```
  The error shape in `ApiError`
  ([frontend/src/types/index.ts](../../frontend/src/types/index.ts)) does
  not match — update the error mapping in the interceptor.

### Token storage security note

`tokenStorage` keeps the JWT in `localStorage` today. This is the
**current** implementation, not the recommended long-term pattern: any
XSS on the site can read the token. The preferred approach is an
httpOnly + Secure refresh-token cookie set by the backend, with the
short-lived access token kept in memory. Treat the localStorage variant
as a temporary workaround and avoid extending it (no extra secrets in
storage, short access-token TTL, strict CSP).

---

## 6. Odds and ends

- **`id` is `number` everywhere, not `string`.** Fix the types, or
  convert with `String(id)` at the boundary — but that is an extra layer
  with no upside.
- **Dates** are `OffsetDateTime` (ISO with timezone, e.g.
  `2026-05-25T14:30:00+02:00`). `new Date(str)` parses fine.
- **Token storage key** in
  [api.ts:42](../../frontend/src/services/api.ts) is `'token'`. If you
  rename it, change both places.
- **Gateway**
  ([gateway/src/middleware/auth.ts](../../gateway/src/middleware/auth.ts))
  forwards `Authorization: Bearer ...` as-is and shares the JWT secret
  with the backend — nothing to configure.

---

## Checklist (work order)

1. Update `frontend/src/types/index.ts`: drop the `ApiResponse` wrapper,
   fix `AuthResponse` / `User` / `Post` / `PaginatedResponse`, switch
   enums to UPPER_CASE, change `id` to `number`.
2. Rework `services/api.ts` — service signatures without `ApiResponse<T>`;
   rename the token storage key if switching to `accessToken`.
3. `authService.ts`: login by username, logout with a body, register
   followed by `PATCH /users/me` for `displayName`.
4. `userService.ts`: rewrite around `/users/me` and `/users/{username}`.
5. `forumService.ts`: drop the mock, wire up the real endpoints.
6. Update components that read `response.data.data` or stale fields.
7. End-to-end smoke: register → login → me → create post → list →
   update → delete → logout.

If you need a backend change (for example adding `displayName` to
`RegisterRequest`), open a ticket — happy to discuss.
