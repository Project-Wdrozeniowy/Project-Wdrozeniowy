import { useQueries, useQuery } from '@tanstack/react-query';
import { searchService } from '@/shared/api/search/searchClient';
import {
  SEARCH_ALL_PAGE_SIZE,
  SEARCH_MIN_LENGTH,
  SEARCH_PREVIEW_SIZE,
  SEARCH_QUERY_KEY,
  SEARCH_TYPE_PAGE_SIZE,
} from '@/shared/api/search/searchQuery.const';
import type { SearchResults, SearchType } from '@/shared/api/search/search.dto';

/** Whether a (trimmed) term is long enough for the API to accept it. */
export function isSearchableTerm(term: string): boolean {
  return term.length >= SEARCH_MIN_LENGTH;
}

/**
 * Top matches of every kind for the header dropdown.
 * `enabled` is false for a term the API would reject, so no request is made for it. The key holds
 * the term, so an answer for an older term can never be shown for the current one, and the
 * request of a superseded term is aborted.
 */
export function useSearchPreview(term: string) {
  return useQuery({
    queryKey: [...SEARCH_QUERY_KEY, 'preview', term],
    queryFn: ({ signal }) =>
      searchService.search(
        { q: term, size: SEARCH_PREVIEW_SIZE },
        // The dropdown shows its own fixed error message; the global toast would print server text.
        { signal, skipErrorToast: true }
      ),
    enabled: isSearchableTerm(term),
    retry: false,
  });
}

interface SearchPagesQuery {
  term: string;
  type?: SearchType;
  /** How many pages are shown (1-based): pages 0 to `pages - 1` are loaded. */
  pages: number;
}

/**
 * The pages of the results page, one query per page, so each is cached and keyed by its own term,
 * type and page. "Load more" only raises `pages`; the pages already loaded stay.
 */
export function useSearchPages({ term, type, pages }: SearchPagesQuery) {
  const size = type ? SEARCH_TYPE_PAGE_SIZE : SEARCH_ALL_PAGE_SIZE;
  return useQueries({
    queries: Array.from({ length: pages }, (_, page) => ({
      queryKey: [...SEARCH_QUERY_KEY, 'page', { term, type, page, size }],
      queryFn: ({ signal }: { signal: AbortSignal }): Promise<SearchResults> =>
        searchService.search({ q: term, type, page, size }, { signal, skipErrorToast: true }),
      enabled: isSearchableTerm(term),
      retry: false,
    })),
  });
}
