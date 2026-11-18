/** The browser storage the app writes itself (the session cookie is Spring's and is not listed). */
export const THEME_STORAGE_KEY = 'orbita.theme';
export const RECENT_SEARCHES_KEY = 'orbita.recentSearches';
/** Remembers the user's answer to the storage question. Written only after they answered. */
export const CONSENT_STORAGE_KEY = 'orbita.consent';

/** Storage that exists only with the user's permission; rejecting or withdrawing deletes it. */
export const OPTIONAL_STORAGE_KEYS = [THEME_STORAGE_KEY, RECENT_SEARCHES_KEY] as const;
