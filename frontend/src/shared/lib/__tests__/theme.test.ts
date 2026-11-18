import {
  THEME_STORAGE_KEY,
  applyTheme,
  currentTheme,
  readAppliedTheme,
  readStoredTheme,
  storeTheme,
  systemTheme,
} from '@/shared/lib/theme';

function prefersDark(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  prefersDark(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the stored choice', () => {
  it('is null until the user picked a theme', () => {
    expect(readStoredTheme()).toBeNull();
  });

  it('round-trips light and dark', () => {
    storeTheme('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(readStoredTheme()).toBe('dark');
    storeTheme('light');
    expect(readStoredTheme()).toBe('light');
  });

  it('ignores anything that is not a theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    expect(readStoredTheme()).toBeNull();
  });

  it('does not fail when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(readStoredTheme()).toBeNull();
    expect(() => storeTheme('dark')).not.toThrow();
  });
});

describe('the system preference', () => {
  it('follows prefers-color-scheme', () => {
    prefersDark(true);
    expect(systemTheme()).toBe('dark');
    prefersDark(false);
    expect(systemTheme()).toBe('light');
  });

  it('falls back to light where matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(systemTheme()).toBe('light');
  });
});

describe('the theme to show', () => {
  it('prefers the user choice over the system', () => {
    prefersDark(true);
    storeTheme('light');
    expect(currentTheme()).toBe('light');
  });

  it('uses the system when the user never chose', () => {
    prefersDark(true);
    expect(currentTheme()).toBe('dark');
  });

  it('reads what is applied to the page, else works it out', () => {
    prefersDark(true);
    expect(readAppliedTheme()).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(readAppliedTheme()).toBe('light');
  });
});
