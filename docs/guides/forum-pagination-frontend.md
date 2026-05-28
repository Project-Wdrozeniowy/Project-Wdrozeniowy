# Frontend гайд: пагинация форума (PWDRZ-70 FE)

Привет! Бэкенд-часть PWDRZ-70 уже сделана в PR #22 (CRUD) + #23 (search/pagination). Эндпоинт работает, дальше — твоя половина. Ниже всё, что нужно: контракт, React Query хук, контролы, URL-стейт.

База: фронт ходит через gateway → бек, `/posts` ниже относительный к `/api`.

---

## 1. Контракт эндпоинта

```
GET /posts
```

### Query-параметры

| Параметр       | Тип     | Дефолт           | Назначение                                                |
|----------------|---------|------------------|-----------------------------------------------------------|
| `page`         | int     | `0`              | Номер страницы, **с нуля**                                |
| `size`         | int     | `20`             | Размер страницы                                           |
| `sort`         | string  | `createdAt,desc` | `field,asc|desc`. Поддерживает `createdAt`, `voteScore`, `lastActivityAt` |
| `q`            | string  | —                | Full-text по title + content (case-insensitive)           |
| `categoryId`   | number  | —                | Фильтр по id категории                                    |
| `categorySlug` | string  | —                | Фильтр по slug категории                                  |
| `author`       | string  | —                | Username автора                                           |
| `status`       | string  | `PUBLISHED`*     | `DRAFT` / `PUBLISHED` / `DELETED` (только для MOD/ADMIN)  |

\* Анонимы и USER **всегда** получают только `PUBLISHED`, даже если передадут `status=DRAFT`. Тихая фильтрация на стороне бека — фронту думать не надо.

### Ответ — `PagedResponse<PostSummaryResponse>`

```ts
interface PagedResponse<T> {
  content: T[];
  page: number;          // текущая страница (с 0)
  size: number;          // размер страницы
  totalElements: number; // всего записей под фильтр
  totalPages: number;    // всего страниц
  hasNext: boolean;
  hasPrev: boolean;
}

interface AuthorSummary  { id: number; username: string; }
interface CategorySummary { id: number; name: string; slug: string; }

interface PostSummaryResponse {
  id: number;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'DELETED';
  isPinned: boolean;
  viewCount: number;
  voteScore: number;
  commentCount: number;
  author: AuthorSummary;
  category: CategorySummary | null;
  createdAt: string;          // ISO OffsetDateTime
  lastActivityAt: string;
  // content в summary НЕТ — для полного текста дёргай GET /posts/{id} или /posts/slug/{slug}
}
```

Положи это в `frontend/src/shared/types/index.ts` рядом с существующими типами (либо в отдельный `pagination.ts` — на твой вкус).

### Пример запроса/ответа

```
GET /posts?page=0&size=20&sort=voteScore,desc&categorySlug=announcements
```

```json
{
  "content": [
    {
      "id": 42, "title": "Welcome!", "slug": "welcome",
      "status": "PUBLISHED", "isPinned": true,
      "viewCount": 312, "voteScore": 87, "commentCount": 14,
      "author":   { "id": 1, "username": "alice" },
      "category": { "id": 3, "name": "Announcements", "slug": "announcements" },
      "createdAt": "2026-05-20T10:00:00Z",
      "lastActivityAt": "2026-05-25T14:30:00Z"
    }
    /* … */
  ],
  "page": 0,
  "size": 20,
  "totalElements": 137,
  "totalPages": 7,
  "hasNext": true,
  "hasPrev": false
}
```

---

## 2. Service-слой

В [forumService.ts](../../frontend/src/services/forumService.ts) сейчас mock — замени:

```ts
import { apiClient } from './api';
import type { PagedResponse, PostSummaryResponse } from '@/shared/types';

export interface ListPostsParams {
  page?: number;
  size?: number;
  sort?: string;
  q?: string;
  categoryId?: number;
  categorySlug?: string;
  author?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'DELETED';
}

export const forumService = {
  list: (params: ListPostsParams = {}) =>
    apiClient.get<PagedResponse<PostSummaryResponse>>('/posts', { params }),
};
```

`axios` сам сериализует `params` в query-string, undefined-значения пропустит.

---

## 3. React Query хук

Под классическую пагинацию (с цифрами и стрелками) — `useQuery` с `placeholderData: keepPreviousData`, чтобы при смене страницы старые данные не моргали:

```ts
// frontend/src/hooks/usePostsPage.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { forumService, type ListPostsParams } from '@/services/forumService';

export function usePostsPage(params: ListPostsParams) {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: () => forumService.list(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
```

Если хочется infinite scroll вместо страниц — берёшь `useInfiniteQuery`:

```ts
import { useInfiniteQuery } from '@tanstack/react-query';

export function usePostsInfinite(filters: Omit<ListPostsParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: ['posts-infinite', filters],
    queryFn: ({ pageParam = 0 }) => forumService.list({ ...filters, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
  });
}
```

`last.hasNext` уже есть — не нужно сравнивать `page + 1 < totalPages` руками.

---

## 4. Контролы пагинации

Минималка с цифрами + Prev/Next:

```tsx
// frontend/src/app/(main)/forum/_components/Pagination.tsx
'use client';

interface Props {
  page: number;         // 0-based
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, hasNext, hasPrev, onChange }: Props) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav aria-label="Pagination" className="flex items-center gap-2">
      <button onClick={() => onChange(page - 1)} disabled={!hasPrev}>Prev</button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={p === page ? 'font-bold' : ''}
          >
            {p + 1 /* показываем 1-based */}
          </button>
        )
      )}
      <button onClick={() => onChange(page + 1)} disabled={!hasNext}>Next</button>
    </nav>
  );
}

function pageWindow(current: number, total: number): (number | '…')[] {
  const span = 1; // сколько соседей слева/справа
  const out: (number | '…')[] = [];
  for (let i = 0; i < total; i++) {
    if (i === 0 || i === total - 1 || Math.abs(i - current) <= span) {
      out.push(i);
    } else if (out[out.length - 1] !== '…') {
      out.push('…');
    }
  }
  return out;
}
```

**Важно:** в URL/UI показывай страницы 1-based (`page + 1`), но в API/state держи 0-based — так совпадёт с бэком и не будет постоянных off-by-one.

---

## 5. URL-стейт (Next.js App Router)

Чтобы юзер мог дать прямую ссылку на «страница 3, отфильтровано по AI», тяни параметры из URL:

```tsx
// frontend/src/app/(main)/forum/page.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { usePostsPage } from '@/hooks/usePostsPage';
import { Pagination } from './_components/Pagination';

export default function ForumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1') - 1; // 1-based в URL → 0-based в API
  const categorySlug = searchParams.get('category') ?? undefined;
  const q = searchParams.get('q') ?? undefined;

  const { data, isLoading, isError } = usePostsPage({ page, size: 20, categorySlug, q });

  const updatePage = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(next + 1));
    router.push(`/forum?${params.toString()}`, { scroll: false });
  };

  if (isLoading) return <PostFeedSkeleton />;
  if (isError || !data) return <p>Failed to load posts.</p>;

  return (
    <>
      <ul>{data.content.map((p) => <PostCard key={p.id} post={p} />)}</ul>
      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        hasNext={data.hasNext}
        hasPrev={data.hasPrev}
        onChange={updatePage}
      />
    </>
  );
}
```

`{ scroll: false }` — чтобы не прыгало в начало при смене страницы (юзер обычно хочет остаться на месте).

---

## 6. Edge-кейсы, на которые стоит обратить внимание

- **Пустой результат.** `content` будет `[]`, `totalPages` будет `0`. Покажи пустое состояние, спрячь контролы (`totalPages <= 1`).
- **Юзер ввёл `page=999` в URL.** Бек вернёт пустой `content` со старым `totalPages`. Сделай fallback: если `page >= totalPages && totalPages > 0` — редирект на последнюю страницу.
- **Фильтр изменился — не сбрасываешь `page`.** Если был `page=5` и юзер выбрал новую категорию, страница может перестать существовать. После любого изменения фильтра — сбрасывай `page` в `0`. Делается в обработчике фильтра, не в `useQuery`.
- **Smooth-loading.** С `keepPreviousData` старые данные остаются на экране, пока грузятся новые. Добавь `data?.isFetching` индикатор сверху списка (например, тонкая полоска), чтобы было видно загрузку.
- **Prefetch.** Если хочешь чтобы переход между страницами был мгновенным:
  ```ts
  const qc = useQueryClient();
  useEffect(() => {
    if (data?.hasNext) {
      qc.prefetchQuery({
        queryKey: ['posts', { ...params, page: params.page! + 1 }],
        queryFn: () => forumService.list({ ...params, page: params.page! + 1 }),
      });
    }
  }, [data, params, qc]);
  ```

---

## 7. Acceptance Criteria PWDRZ-70 — чеклист FE

- [ ] Posts split into pages → рендерится `data.content`, контролы под списком.
- [ ] User can navigate pages → клик по `Prev/Next` и цифрам меняет `?page=` в URL, данные обновляются.
- [ ] Размер страницы 20 (можно вынести в env или дать селектор).
- [ ] При фильтрации/поиске `page` сбрасывается в 1.
- [ ] Прямая ссылка `/forum?page=3&category=ai` восстанавливает состояние.
- [ ] Loading / empty / error состояния обработаны.

---

## 8. Где что в репо

- Эндпоинт и пагинация: [PostController.java](../../backend/src/main/java/com/devpulse/forum/controller/PostController.java), [PostService.java#search](../../backend/src/main/java/com/devpulse/forum/service/PostService.java), [PagedResponse.java](../../backend/src/main/java/com/devpulse/forum/dto/PagedResponse.java), [PostSummaryResponse.java](../../backend/src/main/java/com/devpulse/forum/dto/PostSummaryResponse.java) — всё в ветке `feature/PWDRZ-69-posts-search-filter` (PR #23). После мержа #22 → #23 → develop эти файлы будут в develop.
- Frontend заглушки и моки: [forumService.ts](../../frontend/src/services/forumService.ts), [usePosts.ts](../../frontend/src/hooks/usePosts.ts), [forum/page.tsx](../../frontend/src/app/\(main\)/forum/page.tsx). Их и менять.

---

Если что-то на беке нужно докрутить (например, добавить sort по `commentCount`, или вынести `pageSize` в конфиг, или дать `?ids=1,2,3` для bulk-fetch) — кидай тикет, дополним. Сейчас контракт полностью покрывает acceptance criteria PWDRZ-70.
