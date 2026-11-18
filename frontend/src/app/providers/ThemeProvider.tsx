import { useEffect } from 'react';
import { THEME_STORAGE_KEY, currentTheme, readStoredTheme, systemTheme } from '@/shared/lib/theme';
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
      if (event.key === THEME_STORAGE_KEY || event.key === null) followTheme(currentTheme());
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
