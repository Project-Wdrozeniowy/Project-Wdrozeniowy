import type { SearchType } from '@/shared/api/search/search.dto';

export interface SearchTab {
  label: string;
  /** `undefined` is the "All" tab: every kind. */
  type: SearchType | undefined;
}

export const SEARCH_TABS: readonly SearchTab[] = [
  { label: 'All', type: undefined },
  { label: 'Posts', type: 'POST' },
  { label: 'Users', type: 'USER' },
  { label: 'Tags', type: 'TAG' },
];

/** More pages than this in the URL are treated as this many. */
export const SEARCH_MAX_PAGES = 20;

export const SEARCH_PAGE_TITLE = 'Search';
export const SEARCH_PAGE_INPUT_ID = 'search-page-input';
export const SEARCH_PAGE_INPUT_LABEL = 'Search posts, users and tags';
export const SEARCH_PAGE_PLACEHOLDER = 'Search posts, users, tags…';
export const SEARCH_PAGE_SUBMIT_LABEL = 'Search';

export const SEARCH_PAGE_HINT = 'Type at least 2 characters and press Enter to search.';
export const SEARCH_PAGE_LOADING = 'Searching…';
export const SEARCH_PAGE_EMPTY_TITLE = 'No results found';
export const SEARCH_PAGE_EMPTY_HINT = 'Try different keywords.';
export const SEARCH_PAGE_ERROR_TITLE = 'Something went wrong';
export const SEARCH_PAGE_ERROR_HINT = 'The search is unavailable right now. Please try again.';
export const SEARCH_PAGE_RETRY_LABEL = 'Retry';
export const SEARCH_PAGE_LOAD_MORE_LABEL = 'Load more results';
export const SEARCH_PAGE_LOADING_MORE_LABEL = 'Loading…';
