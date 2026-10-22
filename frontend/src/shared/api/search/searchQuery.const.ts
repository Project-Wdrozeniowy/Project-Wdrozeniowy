/** Root of every cached search result: `['search', ...]`. */
export const SEARCH_QUERY_KEY = ['search'] as const;

/** The API rejects a trimmed query shorter than this or longer than the maximum. */
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;

/** Items per kind in the header dropdown. */
export const SEARCH_PREVIEW_SIZE = 3;

/** Items per kind on the "All" tab of the results page. */
export const SEARCH_ALL_PAGE_SIZE = 5;

/** Items per page when a single kind is selected on the results page. */
export const SEARCH_TYPE_PAGE_SIZE = 10;

/** Pause after the last keystroke before the dropdown asks the API. */
export const SEARCH_DEBOUNCE_MS = 300;
