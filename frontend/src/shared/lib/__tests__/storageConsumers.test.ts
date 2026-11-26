import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeStorageConsent } from '@/shared/lib/storageConsent';
import { readStoredTheme, storeTheme } from '@/shared/lib/theme';
import { addRecentSearch, readRecentSearches } from '@/shared/lib/recentSearches';
const script = readFileSync(resolve(process.cwd(), 'public/theme-init.js'), 'utf8');
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  writeStorageConsent({ theme: false, recentSearches: false });
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
});
afterEach(() => vi.unstubAllGlobals());
it.each([
  [false, false],
  [true, false],
  [false, true],
  [true, true],
])('gates theme and history independently (%s/%s)', (theme, recentSearches) => {
  writeStorageConsent({ theme, recentSearches });
  storeTheme('dark');
  addRecentSearch('react');
  expect(readStoredTheme()).toBe(theme ? 'dark' : null);
  expect(readRecentSearches()).toEqual(recentSearches ? ['react'] : []);
  new Function(script)();
  expect(document.documentElement.dataset.theme).toBe(theme ? 'dark' : 'light');
});
it('never reads optional values without permission', () => {
  localStorage.setItem('orbita.theme', 'dark');
  localStorage.setItem('orbita.recentSearches', '["private"]');
  const spy = vi.spyOn(localStorage, 'getItem');
  readStoredTheme();
  readRecentSearches();
  new Function(script)();
  expect(spy.mock.calls.flat()).not.toContain('orbita.theme');
  expect(spy.mock.calls.flat()).not.toContain('orbita.recentSearches');
});
it.each(['granted', 'denied', '{}', 'invalid'])(
  'early script invalidates %s and removes stale optional data',
  (value) => {
    localStorage.setItem('orbita.consent', value);
    localStorage.setItem('orbita.theme', 'dark');
    localStorage.setItem('orbita.recentSearches', '["old"]');
    new Function(script)();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('orbita.theme')).toBeNull();
    expect(localStorage.getItem('orbita.recentSearches')).toBeNull();
  }
);
