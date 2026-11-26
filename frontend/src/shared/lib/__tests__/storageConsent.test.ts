import {
  clearOptionalStorage,
  hasStorageConsent,
  readStorageConsent,
  synchronizeStorageConsent,
  writeStorageConsent,
  OPTIONAL_STORAGE_PURPOSES,
  parseStorageConsent,
} from '@/shared/lib/storageConsent';
import { seedStorageConsent } from '@/test/storageConsent';
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  seedStorageConsent(false);
  localStorage.clear();
});
afterEach(() => vi.restoreAllMocks());
it('starts with no answer or permissions', () => {
  expect(readStorageConsent()).toBeNull();
  expect(hasStorageConsent('theme')).toBe(false);
});
it('clears optional data without clearing the necessary answer or unrelated keys', () => {
  seedStorageConsent();
  const answer = localStorage.getItem('orbita.consent');
  localStorage.setItem('orbita.theme', 'dark');
  localStorage.setItem('orbita.recentSearches', '["react"]');
  localStorage.setItem('unrelated', 'keep');
  expect(clearOptionalStorage()).toBe(true);
  expect(localStorage.getItem('orbita.theme')).toBeNull();
  expect(localStorage.getItem('orbita.recentSearches')).toBeNull();
  expect(localStorage.getItem('orbita.consent')).toBe(answer);
  expect(localStorage.getItem('unrelated')).toBe('keep');
});
it('reports blocked reads, writes and deletion without throwing', () => {
  vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(readStorageConsent()).toBeNull();
  expect(writeStorageConsent({ theme: true, recentSearches: true }).ok).toBe(false);
  expect(synchronizeStorageConsent().ok).toBe(false);
});
it('registers exactly the two controllable purposes', () => {
  expect(OPTIONAL_STORAGE_PURPOSES).toEqual({
    theme: ['orbita.theme'],
    recentSearches: ['orbita.recentSearches'],
  });
});
it.each([
  { version: 3, decidedAt: Date.now(), permissions: { theme: true, recentSearches: true } },
  {
    version: 2,
    decidedAt: Date.now() + 100000,
    permissions: { theme: true, recentSearches: true },
  },
  { version: 2, decidedAt: 0, permissions: { theme: true, recentSearches: true } },
  { version: 2, decidedAt: Date.now(), permissions: { theme: 'yes', recentSearches: true } },
  { version: 2, decidedAt: Date.now(), permissions: { theme: true } },
])('rejects an unsupported or invalid record', (value) => {
  expect(parseStorageConsent(JSON.stringify(value))).toBeNull();
});
