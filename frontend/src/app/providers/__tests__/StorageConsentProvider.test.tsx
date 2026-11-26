import { act, render, renderHook } from '@testing-library/react';
import StorageConsentProvider from '../StorageConsentProvider';
import { useStore } from '@/store';
import { createConsentSlice } from '@/store/slices/consentSlice';
import { createUISlice } from '@/store/slices/uiSlice';
import { CONSENT_LIFETIME_MS, writeStorageConsent } from '@/shared/lib/storageConsent';
import { useRecentSearches } from '@/shared/lib/useRecentSearches';
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-01T00:00:00Z'));
  localStorage.clear();
  writeStorageConsent({ theme: true, recentSearches: true });
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  useStore.setState({
    ...createUISlice(useStore.setState, useStore.getState, useStore),
    ...createConsentSlice(useStore.setState, useStore.getState, useStore),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('expires choices in an open page and clears optional data', () => {
  localStorage.setItem('orbita.theme', 'dark');
  useStore.setState({ consentDialogOpen: true });
  render(<StorageConsentProvider />);
  act(() => vi.advanceTimersByTime(CONSENT_LIFETIME_MS));
  expect(useStore.getState().storageConsent).toBeNull();
  expect(useStore.getState().consentPromptOpen).toBe(true);
  expect(localStorage.getItem('orbita.theme')).toBeNull();
  expect(useStore.getState().storageConsentNotice).toContain('no longer valid');
});
it('applies storage events and clears an already displayed history', () => {
  localStorage.setItem('orbita.recentSearches', '["react"]');
  render(<StorageConsentProvider />);
  const history = renderHook(() => useRecentSearches());
  act(() => history.result.current.refresh());
  expect(history.result.current.terms).toEqual(['react']);
  act(() => {
    writeStorageConsent({ theme: true, recentSearches: false });
    window.dispatchEvent(new StorageEvent('storage', { key: 'orbita.consent' }));
  });
  expect(history.result.current.terms).toEqual([]);
  expect(useStore.getState().storageConsent?.permissions.recentSearches).toBe(false);
});
it('checks again when returning to a page or focusing it', () => {
  render(<StorageConsentProvider />);
  localStorage.removeItem('orbita.consent');
  act(() => window.dispatchEvent(new Event('pageshow')));
  expect(useStore.getState().consentPromptOpen).toBe(true);
  writeStorageConsent({ theme: false, recentSearches: false });
  act(() => window.dispatchEvent(new Event('focus')));
  expect(useStore.getState().consentPromptOpen).toBe(false);
});
