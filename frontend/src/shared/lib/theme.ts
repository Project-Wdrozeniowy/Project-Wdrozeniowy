import { hasStorageConsent } from '@/shared/lib/storageConsent';
import { THEME_STORAGE_KEY } from '@/shared/lib/storageKeys.const';

export { THEME_STORAGE_KEY };
export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/**
 * The theme the user picked, or `null` when they never did (then the system decides). Only the
 * word "light" or "dark" is stored, never user data, and only after the user accepted optional
 * storage. Storage can be missing or blocked, so every access is guarded and fails to "no choice".
 */
export function readStoredTheme(): Theme | null {
  if (!hasStorageConsent('theme')) return null;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: Theme): boolean {
  if (!hasStorageConsent('theme')) return false;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    // Not persisted; the theme still applies for this visit.
    return false;
  }
}

export function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** The user's choice if there is one, else the system's. */
export function currentTheme(): Theme {
  return readStoredTheme() ?? systemTheme();
}

/** What the page shows right now (`theme-init.js` sets it before the first paint). */
export function readAppliedTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  const applied = document.documentElement.getAttribute('data-theme');
  return isTheme(applied) ? applied : currentTheme();
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}
