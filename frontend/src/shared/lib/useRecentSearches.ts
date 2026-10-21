import { useCallback, useState } from 'react';
import { addRecentSearch, readRecentSearches, removeRecentSearch } from './recentSearches';

export function useRecentSearches() {
  // Empty until `refresh`: the server render has no storage, so the first render must match it.
  const [terms, setTerms] = useState<string[]>([]);

  /** Reads the stored terms again, e.g. when the input gets the focus. */
  const refresh = useCallback(() => setTerms(readRecentSearches()), []);
  const add = useCallback((term: string) => setTerms(addRecentSearch(term)), []);
  const remove = useCallback((term: string) => setTerms(removeRecentSearch(term)), []);

  return { terms, refresh, add, remove };
}
