import { useEffect } from 'react';
import { currentTheme, readStoredTheme, systemTheme } from '@/shared/lib/theme';
import { CONSENT_STORAGE_KEY, THEME_STORAGE_KEY } from '@/shared/lib/storageKeys.const';
import { useStore } from '@/store';

/**
 * Keeps the page's theme in step with the user's choice and, without one, with the system.
 * Another tab changing the choice reaches this one through the `storage` event.
 */
export default function ThemeProvider() {
  const followTheme = useStore((state) => state.followTheme);

  useEffect(() => {
    followTheme(currentTheme());

    // Some environments (old browsers, test DOMs) have no matchMedia: then there is nothing to follow.
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if (readStoredTheme() === null) followTheme(systemTheme());
    };
    const onStorage = (event: StorageEvent) => {
      const relevant = [THEME_STORAGE_KEY, CONSENT_STORAGE_KEY];
      if (event.key === null || relevant.includes(event.key)) followTheme(currentTheme());
    };
    query?.addEventListener('change', onSystemChange);
    window.addEventListener('storage', onStorage);
    return () => {
      query?.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [followTheme]);

  return null;
}
