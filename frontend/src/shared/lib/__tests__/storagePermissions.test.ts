import {
  CONSENT_LIFETIME_MS,
  hasStorageConsent,
  readStorageConsent,
  synchronizeStorageConsent,
  writeStorageConsent,
} from '@/shared/lib/storageConsent';
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute('data-storage-unavailable');
});
afterEach(() => vi.useRealTimers());
it.each([
  [false, false],
  [true, false],
  [false, true],
  [true, true],
])('stores independent choices %s/%s', (theme, recentSearches) => {
  expect(writeStorageConsent({ theme, recentSearches }).ok).toBe(true);
  expect(readStorageConsent()?.permissions).toEqual({ theme, recentSearches });
  expect(hasStorageConsent('theme')).toBe(theme);
  expect(hasStorageConsent('recentSearches')).toBe(recentSearches);
});
it.each(['granted', 'denied', '{}', 'null', '[]', 'broken'])(
  'invalidates old or invalid %s',
  (value) => {
    localStorage.setItem('orbita.consent', value);
    localStorage.setItem('orbita.theme', 'dark');
    localStorage.setItem('orbita.recentSearches', '["old"]');
    localStorage.setItem('unrelated', 'keep');
    expect(synchronizeStorageConsent()).toEqual({ ok: true, consent: null });
    expect(localStorage.getItem('orbita.theme')).toBeNull();
    expect(localStorage.getItem('orbita.recentSearches')).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('keep');
  }
);
it('expires at exactly 180 days without extending on reads', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  writeStorageConsent({ theme: true, recentSearches: false });
  const original = localStorage.getItem('orbita.consent');
  vi.advanceTimersByTime(CONSENT_LIFETIME_MS - 1);
  expect(hasStorageConsent('theme')).toBe(true);
  expect(localStorage.getItem('orbita.consent')).toBe(original);
  vi.advanceTimersByTime(1);
  expect(readStorageConsent()).toBeNull();
});
it('deletes only the disabled purpose', () => {
  localStorage.setItem('orbita.theme', 'dark');
  localStorage.setItem('orbita.recentSearches', '["react"]');
  writeStorageConsent({ theme: false, recentSearches: true });
  expect(localStorage.getItem('orbita.theme')).toBeNull();
  expect(localStorage.getItem('orbita.recentSearches')).toBe('["react"]');
});
it('reports write errors and never continues using an old grant', () => {
  writeStorageConsent({ theme: true, recentSearches: true });
  const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  expect(writeStorageConsent({ theme: false, recentSearches: false }).ok).toBe(false);
  expect(hasStorageConsent('theme')).toBe(false);
  spy.mockRestore();
  expect(writeStorageConsent({ theme: true, recentSearches: false }).ok).toBe(true);
});
it('reports failed deletion', () => {
  const spy = vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(writeStorageConsent({ theme: false, recentSearches: false }).ok).toBe(false);
  expect(hasStorageConsent('theme')).toBe(false);
  spy.mockRestore();
});
it('keeps the shared answer intact when this document is locked after a failed save', () => {
  writeStorageConsent({ theme: true, recentSearches: true });
  const original = localStorage.getItem('orbita.consent');
  const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  writeStorageConsent({ theme: false, recentSearches: false });
  spy.mockRestore();
  expect(synchronizeStorageConsent()).toEqual({ ok: false, consent: null });
  expect(localStorage.getItem('orbita.consent')).toBe(original);
  expect(hasStorageConsent('recentSearches')).toBe(false);
});
it('fails closed when synchronization cannot remove a revoked value', () => {
  writeStorageConsent({ theme: true, recentSearches: false });
  const spy = vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(synchronizeStorageConsent()).toEqual({ ok: false, consent: null });
  expect(hasStorageConsent('theme')).toBe(false);
  spy.mockRestore();
});
it('reports an unreadable answer without erasing it as if it were missing', () => {
  writeStorageConsent({ theme: true, recentSearches: true });
  const original = localStorage.getItem('orbita.consent');
  const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
    throw new Error('blocked read');
  });
  expect(synchronizeStorageConsent()).toEqual({ ok: false, consent: null });
  spy.mockRestore();
  expect(localStorage.getItem('orbita.consent')).toBe(original);
});
