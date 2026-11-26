import { useEffect } from 'react';
import { currentTheme, readStoredTheme, systemTheme } from '@/shared/lib/theme';
import { CONSENT_STORAGE_KEY, THEME_STORAGE_KEY } from '@/shared/lib/storageKeys.const';
import { CONSENT_CHANGED_EVENT } from '@/shared/lib/storageConsent';
import { useStore } from '@/store';
export default function ThemeProvider() {
  const followTheme = useStore((state) => state.followTheme);
  useEffect(() => {
    followTheme(currentTheme());
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if (useStore.getState().themeChoice === null && readStoredTheme() === null)
        followTheme(systemTheme());
    };
    const onConsentChange = () => {
      const selected = useStore.getState().themeChoice;
      followTheme(readStoredTheme() ?? selected ?? systemTheme());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || [THEME_STORAGE_KEY, CONSENT_STORAGE_KEY].includes(event.key)) {
        const stored = readStoredTheme();
        useStore.setState({ themeChoice: stored });
        followTheme(stored ?? systemTheme());
      }
    };
    query?.addEventListener('change', onSystemChange);
    window.addEventListener('storage', onStorage);
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChange);
    return () => {
      query?.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChange);
    };
  }, [followTheme]);
  return null;
}
