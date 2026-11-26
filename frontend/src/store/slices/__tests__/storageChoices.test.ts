import { createStore } from 'zustand';
import { createConsentSlice, type ConsentSlice } from '../consentSlice';
import { createUISlice, type UISlice } from '../uiSlice';
import { writeStorageConsent } from '@/shared/lib/storageConsent';
function makeStore() {
  return createStore<ConsentSlice & UISlice>()((...args) => ({
    ...createUISlice(...args),
    ...createConsentSlice(...args),
  }));
}
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  writeStorageConsent({ theme: false, recentSearches: false });
  localStorage.clear();
  document.documentElement.dataset.theme = 'light';
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
});
afterEach(() => vi.unstubAllGlobals());
it('starts unanswered and opens preferences without granting anything', () => {
  const store = makeStore();
  store.getState().reopenConsentPrompt();
  expect(store.getState().storageConsent).toBeNull();
  expect(store.getState().consentDialogOpen).toBe(true);
  store.getState().closeConsentPrompt();
  expect(store.getState().consentPromptOpen).toBe(true);
});
it('remembers an explicit choice even when it equals the system', () => {
  const store = makeStore();
  store.getState().setTheme('light');
  expect(localStorage.getItem('orbita.theme')).toBeNull();
  expect(store.getState().saveStorageChoices({ theme: true, recentSearches: false })).toBe(true);
  expect(localStorage.getItem('orbita.theme')).toBe('light');
});
it('does not pin the system theme when no explicit choice was made', () => {
  const store = makeStore();
  store.getState().acceptStorage();
  expect(localStorage.getItem('orbita.theme')).toBeNull();
});
it('withdraws theme while preserving permitted search history', () => {
  const store = makeStore();
  store.getState().acceptStorage();
  store.getState().setTheme('dark');
  localStorage.setItem('orbita.recentSearches', '["react"]');
  store.getState().saveStorageChoices({ theme: false, recentSearches: true });
  expect(store.getState().theme).toBe('light');
  expect(store.getState().themeChoice).toBeNull();
  expect(localStorage.getItem('orbita.theme')).toBeNull();
  expect(localStorage.getItem('orbita.recentSearches')).toBe('["react"]');
});
it('applies withdrawal from another tab', () => {
  const store = makeStore();
  store.getState().acceptStorage();
  store.getState().setTheme('dark');
  writeStorageConsent({ theme: false, recentSearches: true });
  store.getState().syncConsent();
  expect(store.getState().storageConsent?.permissions.theme).toBe(false);
  expect(store.getState().theme).toBe('light');
});
it('reports failure, opens settings and does not present a remembered grant', () => {
  const store = makeStore();
  const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  expect(store.getState().saveStorageChoices({ theme: true, recentSearches: true })).toBe(false);
  expect(store.getState().storageConsent).toBeNull();
  expect(store.getState().storageConsentError).toBeTruthy();
  expect(store.getState().consentDialogOpen).toBe(true);
  spy.mockRestore();
});
