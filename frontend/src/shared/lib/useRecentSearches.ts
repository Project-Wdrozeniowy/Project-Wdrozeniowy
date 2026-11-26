import { useCallback, useEffect, useState } from 'react';
import { addRecentSearch, readRecentSearches, removeRecentSearch } from './recentSearches';
import { CONSENT_CHANGED_EVENT } from './storageConsent';
export function useRecentSearches() {
  const [terms, setTerms] = useState<string[]>([]);
  const refresh = useCallback(() => setTerms(readRecentSearches()), []);
  useEffect(() => {
    window.addEventListener(CONSENT_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, refresh);
  }, [refresh]);
  const add = useCallback((term: string) => setTerms(addRecentSearch(term)), []);
  const remove = useCallback((term: string) => setTerms(removeRecentSearch(term)), []);
  return { terms, refresh, add, remove };
}
