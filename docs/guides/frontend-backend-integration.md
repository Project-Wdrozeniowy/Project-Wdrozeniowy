# Frontend ↔ Backend integration guide

Привет! Это шпаргалка по тому, как подружить фронт (`frontend/src/services/*` + `shared/types`) с реальным беком после мержа PR-ов #19–#23. Сейчас контракты расходятся в 6 местах — ниже что именно сломано и как чинить. Все правки — на стороне фронта (бек уже задеплоен в таком виде, менять его дороже).

База: фронт ходит через gateway → бек, поэтому URL-ы в примерах относительные к `/api`.

---

## 1. `ApiResponse<T>`-обёртки на беке нет

**Где сейчас:** [frontend/src/shared/types/index.ts:3](../../frontend/src/shared/types/index.ts) — `ApiResponse<T> = { data, message, status, success }`. Все сервисы возвращают `Promise<ApiResponse<T>>`.

**Реальность:** бек отдаёт DTO **напрямую**. Никакого `{ data, success }`. То есть `response.data` у axios уже и есть полезная нагрузка.

**Что делать:**
- Удалить тип `ApiResponse` либо переименовать в маркер только для legacy-кода.
- В сервисах поменять сигнатуры на возвращаемый DTO напрямую:

```ts
// было
login: (data): Promise<ApiResponse<AuthResponse>> =>
  apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data),

// стало
login: (data: LoginRequest): Promise<AuthResponse> =>
  apiClient.post<AuthResponse>('/auth/login', data),
```

- HTTP-ошибки и так бросаются axios-ом (interceptor уже есть в [api.ts:52](../../frontend/src/services/api.ts)), `success` не нужен.

---

## 2. Auth: токены и login

### 2.1 `AuthResponse` — другие поля

**Бек отдаёт:**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "a1b2c3...",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

В ответе **нет `user`**. Чтобы получить профиль после логина — отдельный `GET /users/me`.

**Поменять в `shared/types/index.ts`:**
```ts
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}
```

В [authService.ts](../../frontend/src/services/authService.ts) переименовать `token → accessToken` везде, где он используется (`tokenStorage.setTokens`, request interceptor в [api.ts:43](../../frontend/src/services/api.ts) — там `localStorage.getItem('token')`, ключ оставить можно, но значение класть из `accessToken`).

После `login`/`register` сделать второй вызов:
```ts
const auth = await authService.login(creds);
tokenStorage.setTokens(auth.accessToken, auth.refreshToken);
const me = await userService.getMe();
authStore.setUser(me);
```

### 2.2 Login принимает `username`, а не `email`

Бек `AuthRequest`: `{ username, password }`. В [lib/validations/auth.ts](../../frontend/src/lib/validations/auth.ts) форма логина — `{ email, password }`. Варианты:
- (рекомендую) Переименовать поле формы в `username`, поправить лейбл «Username».
- Либо: оставить email в UI, но на отправке мапить `{ username: form.email, password: form.password }`. Это костыль — бек по email искать не умеет.

### 2.3 Register: `displayName` и `interests` молча теряются

Бек `RegisterRequest` принимает только `username, email, password`. Лишние поля Jackson проигнорирует — пользователь зарегистрируется, но `displayName` будет пустой.

**Что делать:** после `register` сразу вызвать `PATCH /users/me` с `displayName`:
```ts
const auth = await authService.register({ username, email, password });
tokenStorage.setTokens(auth.accessToken, auth.refreshToken);
await userService.updateMe({ displayName });
```

`interests` пока нигде на беке нет — либо выпили из формы, либо положи в `localStorage` до появления соответствующего эндпойнта.

### 2.4 Logout требует тело с `refreshToken`

Сейчас фронт шлёт пустой POST. Бек ждёт `{ refreshToken }` и упадёт в 400.

```ts
logout: (): Promise<void> => {
  const refreshToken = tokenStorage.getRefreshToken();
  return apiClient.post<void>('/auth/logout', { refreshToken });
},
```

### 2.5 Refresh

Бек ротирует токены — каждый успешный `/auth/refresh` возвращает **новую** пару. После ответа сразу перезаписывай оба в storage. Если бек ответит 401 на refresh — это reuse-detection, токен семьи отозван, нужно гнать на `/login`.

---

## 3. User profile: роуты и enum-кейсы

### 3.1 Роуты

В [userService.ts](../../frontend/src/services/userService.ts) сейчас generic CRUD по `/users/:id`. **Такого нет.** Доступны:

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/users/me` | свой полный профиль |
| PATCH | `/users/me` | обновить displayName/email/avatarUrl/bio |
| POST | `/users/me/password` | сменить пароль (`{ currentPassword, newPassword }`), возвращает 204, **инвалидирует все refresh-токены** |
| GET | `/users/{username}` | публичный профиль (по username, не по id!) |

`POST /users` и `DELETE /users/:id` для фронта не существуют. `getUsers` (список) — тоже нет.

Перепиши сервис примерно так:
```ts
export const userService = {
  getMe: () => apiClient.get<ProfileResponse>('/users/me'),
  updateMe: (data: UpdateProfileRequest) => apiClient.patch<ProfileResponse>('/users/me', data),
  changePassword: (data: ChangePasswordRequest) =>
    apiClient.post<void>('/users/me/password', data),
  getPublicProfile: (username: string) =>
    apiClient.get<PublicProfileResponse>(`/users/${username}`),
};
```

### 3.2 Поля профиля

`ProfileResponse` (для `/users/me`):
```ts
interface ProfileResponse {
  id: number;                  // ← number, не string!
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';        // ← UPPER_CASE
  status: 'ACTIVE' | 'BANNED' | 'DEACTIVATED'; // ← UPPER_CASE, и 'DEACTIVATED', не 'suspended'
  postCount: number;
  commentCount: number;
  createdAt: string;           // ISO OffsetDateTime
}
```

`PublicProfileResponse` (для `/users/{username}`) — то же, но без `email`, `role`, `status`.

**Чего на беке нет** (выпили из типа): `emailVerifiedAt`, `updatedAt`, `banReason`.

### 3.3 Enum-кейс — нижний vs верхний

В типах фронта роли/статусы в lowercase. Бек шлёт `USER`/`ACTIVE`/`PUBLISHED`. Два варианта:
- (рекомендую) поменять литералы во фронт-типах на UPPER_CASE — это просто и однозначно.
- Либо нормализовать в одном месте (response-interceptor или mapper-функция), но тогда придётся помнить про обратное преобразование на отправку.

---

## 4. Posts (после мержа #22 и #23)

### 4.1 Эндпойнты

| Метод | Путь | Кто может | Что возвращает |
|---|---|---|---|
| GET | `/posts?q=&categoryId=&categorySlug=&author=&status=&page=&size=&sort=` | все | `PagedResponse<PostSummaryResponse>` |
| GET | `/posts/{id}` | все | `PostResponse` |
| GET | `/posts/slug/{slug}` | все | `PostResponse` |
| POST | `/posts` | авторизованный | `PostResponse` |
| PUT | `/posts/{id}` | автор / MOD / ADMIN | `PostResponse` |
| DELETE | `/posts/{id}` | автор / MOD / ADMIN | 204 (soft-delete) |

Дефолты списка: `size=20`, `sort=createdAt,desc`. Аноним и USER **никогда** не получат `DRAFT`/`DELETED`, даже если передать `status=DRAFT` (тихо отфильтруется).

### 4.2 Типы

```ts
interface AuthorSummary { id: number; username: string; }
interface CategorySummary { id: number; name: string; slug: string; }

interface PostResponse {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'DELETED';   // ← UPPER_CASE
  isPinned: boolean;
  viewCount: number;
  voteScore: number;
  commentCount: number;
  author: AuthorSummary;        // вложенный объект, не userId-строка
  category: CategorySummary | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

// PostSummaryResponse — то же, но БЕЗ content и updatedAt (для списка)

interface CreatePostRequest {
  title: string;            // 5..255
  content: string;          // 1..50000
  categoryId?: number | null;
}

interface UpdatePostRequest {
  title?: string;
  content?: string;
  categoryId?: number | null;
  clearCategory?: boolean;  // true → отвязать категорию (т.к. null = "не трогать")
}
```

### 4.3 Пагинация — НЕ совпадает с `PaginatedResponse` во фронте

Бек шлёт:
```ts
interface PagedResponse<T> {
  content: T[];          // ← не `data`
  page: number;
  size: number;          // ← не `pageSize`
  totalElements: number; // ← не `total`
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

Поменяй `PaginatedResponse` в [shared/types/index.ts:183](../../frontend/src/shared/types/index.ts) под эти поля (или заведи `PagedResponse` рядом и используй его для постов).

### 4.4 Подключение к UI

[forumService.ts](../../frontend/src/services/forumService.ts) сейчас возвращает `MOCK_POSTS`. Заменить на:
```ts
export const forumService = {
  list: (params: SearchParams) =>
    apiClient.get<PagedResponse<PostSummaryResponse>>('/posts', { params }),
  getById: (id: number) => apiClient.get<PostResponse>(`/posts/${id}`),
  getBySlug: (slug: string) => apiClient.get<PostResponse>(`/posts/slug/${slug}`),
  create: (data: CreatePostRequest) => apiClient.post<PostResponse>('/posts', data),
  update: (id: number, data: UpdatePostRequest) =>
    apiClient.put<PostResponse>(`/posts/${id}`, data),
  remove: (id: number) => apiClient.delete<void>(`/posts/${id}`),
};
```

В UI учти, что у `PostSummaryResponse` **нет `content`** — для превью используй `title` + что-то ещё, а полный текст подгружай по клику через `getById`.

---

## 5. Roles & authorization (PR #19)

- Доступные роли: `USER`, `MODERATOR`, `ADMIN`.
- Пробный admin-only роут: `GET /admin/ping` → 200 `{ "status": "ok", "scope": "admin" }`. Удобно дергать из route-guard, чтобы проверить «а правда ли я админ».
- Бек возвращает **RFC 9457 ProblemDetail** на 401/403:
  ```json
  { "type": "...", "title": "Forbidden", "status": 403, "detail": "..." }
  ```
  Структура ошибки в `ApiError` ([types/index.ts:10](../../frontend/src/shared/types/index.ts)) не совпадает — обнови маппинг ошибок в interceptor.

---

## 6. Мелочи

- **`id` везде number, не string.** Просто исправь в типах, либо мапь в `String(id)` на границе — но это лишний слой.
- **Даты** — `OffsetDateTime` (ISO с таймзоной, `2026-05-25T14:30:00+02:00`). `new Date(str)` парсит нормально.
- **Storage-ключ для токена** в [api.ts:42](../../frontend/src/services/api.ts) — `'token'`. Если переименуешь — поменяй в обоих местах.
- **Gateway** ([gateway/src/middleware/auth.ts](../../gateway/src/middleware/auth.ts)) проксирует `Authorization: Bearer ...` как есть, JWT-секрет шарится с беком — ничего настраивать не надо.

---

## Чеклист порядка работ

1. Обновить `shared/types/index.ts`: убрать `ApiResponse`-обёртку, поправить `AuthResponse`/`User`/`Post`/`PaginatedResponse`, перейти на UPPER_CASE enum-ы, `id: number`.
2. Перепилить `services/api.ts` — сигнатуры без `ApiResponse<T>`, переименовать ключ токена если решили на `accessToken`.
3. `authService.ts`: login по username, logout с телом, register + follow-up `PATCH /users/me` для `displayName`.
4. `userService.ts`: переписать под `/users/me` + `/users/{username}`.
5. `forumService.ts`: убрать мок, подключить реальные эндпойнты.
6. Обновить компоненты, которые сейчас читают `response.data.data` и старые поля.
7. Прогнать e2e: register → login → me → create post → list → update → delete → logout.

Если что-то на беке хочется поменять (например, добавить `displayName` в `RegisterRequest`) — кидай тикет, обсудим.
