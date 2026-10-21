import type { SearchType } from '@/shared/api/search/search.dto';

/** Page of a post. Posts are the only search result with a page to open. */
export function postHref(slug: string): string {
  return `/forum/${encodeURIComponent(slug)}`;
}

interface SearchPageLink {
  q: string;
  type?: SearchType;
  /** Pages shown, 1-based. Left out for the first. */
  page?: number;
}

/** `/search?q=…&type=…&page=…`, with every value encoded. */
export function searchPageHref({ q, type, page }: SearchPageLink): string {
  const params = new URLSearchParams({ q });
  if (type) params.set('type', type);
  if (page && page > 1) params.set('page', String(page));
  return `/search?${params.toString()}`;
}
