export const RECENT_SEARCHES_KEY = 'orbita.recentSearches';
export const RECENT_SEARCHES_LIMIT = 5;

/**
 * Search terms the user typed before, newest first. Only plain terms are kept, never tokens or
 * user data. Storage can be missing or blocked, so every access is guarded and fails to "nothing".
 */
export function readRecentSearches(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    const terms = parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
    return [...new Set(terms)].slice(0, RECENT_SEARCHES_LIMIT);
  } catch {
    return [];
  }
}

function write(terms: string[]): string[] {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(terms));
  } catch {
    // Not persisted; the list still works for this visit.
  }
  return terms;
}

/** Puts `term` first and drops an earlier copy of it (case-insensitive) and the overflow. */
export function addRecentSearch(term: string): string[] {
  const trimmed = term.trim();
  if (!trimmed) return readRecentSearches();
  const others = readRecentSearches().filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
  return write([trimmed, ...others].slice(0, RECENT_SEARCHES_LIMIT));
}

export function removeRecentSearch(term: string): string[] {
  return write(readRecentSearches().filter((t) => t !== term));
}
