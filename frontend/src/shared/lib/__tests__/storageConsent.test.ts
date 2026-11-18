import {
  clearOptionalStorage,
  hasStorageConsent,
  readStorageConsent,
  writeStorageConsent,
} from '@/shared/lib/storageConsent';
import {
  CONSENT_STORAGE_KEY,
  OPTIONAL_STORAGE_KEYS,
  RECENT_SEARCHES_KEY,
  THEME_STORAGE_KEY,
} from '@/shared/lib/storageKeys.const';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('the answer', () => {
  it('is null until the user answered', () => {
    expect(readStorageConsent()).toBeNull();
    expect(hasStorageConsent()).toBe(false);
  });

  it('round-trips', () => {
    writeStorageConsent('granted');
    expect(readStorageConsent()).toBe('granted');
    expect(hasStorageConsent()).toBe(true);

    writeStorageConsent('denied');
    expect(readStorageConsent()).toBe('denied');
    expect(hasStorageConsent()).toBe(false);
  });

  it('treats anything else as no answer', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'yes');

    expect(readStorageConsent()).toBeNull();
  });

  it('is "no answer" and not an error where storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(readStorageConsent()).toBeNull();
    expect(() => writeStorageConsent('granted')).not.toThrow();
  });
});

describe('clearOptionalStorage', () => {
  it('deletes the optional items and keeps the answer', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    localStorage.setItem(RECENT_SEARCHES_KEY, '["react"]');
    localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    localStorage.setItem('unrelated', 'keep');

    clearOptionalStorage();

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(RECENT_SEARCHES_KEY)).toBeNull();
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted');
    expect(localStorage.getItem('unrelated')).toBe('keep');
  });

  it('lists exactly the optional items', () => {
    expect([...OPTIONAL_STORAGE_KEYS].sort()).toEqual([RECENT_SEARCHES_KEY, THEME_STORAGE_KEY]);
  });

  it('does not throw where storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => clearOptionalStorage()).not.toThrow();
  });
});
