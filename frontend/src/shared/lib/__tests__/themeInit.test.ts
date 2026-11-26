import { seedStorageConsent } from '@/test/storageConsent';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { THEME_STORAGE_KEY, currentTheme } from '@/shared/lib/theme';

/**
 * public/theme-init.js runs before the app, so it cannot import shared/lib/theme.ts. These tests
 * run the real script and hold it to the same answers as the module.
 */
const script = readFileSync(resolve(process.cwd(), 'public/theme-init.js'), 'utf8');

function runScript() {
  document.documentElement.removeAttribute('data-theme');
  new Function(script)();
  return document.documentElement.getAttribute('data-theme');
}

function prefersDark(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches }));
}

beforeEach(() => {
  localStorage.clear();
  seedStorageConsent();
  prefersDark(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('theme-init.js', () => {
  it.each([
    ['nothing stored, system light', null, false, 'light'],
    ['nothing stored, system dark', null, true, 'dark'],
    ['dark stored, system light', 'dark', false, 'dark'],
    ['light stored, system dark', 'light', true, 'light'],
    ['junk stored, system dark', 'purple', true, 'dark'],
  ])('%s -> %s', (_name, stored, dark, expected) => {
    if (stored) localStorage.setItem(THEME_STORAGE_KEY, stored);
    prefersDark(dark);

    expect(runScript()).toBe(expected);
    expect(currentTheme()).toBe(expected);
  });

  it('still follows the system when storage is blocked', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    prefersDark(true);

    expect(runScript()).toBe('dark');
  });

  it('is light where matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(runScript()).toBe('light');
  });

  it.each([
    ['no answer', null],
    ['rejected', 'denied'],
  ])('ignores a stored theme when the user gave no permission (%s)', (_name, answer) => {
    localStorage.removeItem('orbita.consent');
    if (answer) localStorage.setItem('orbita.consent', answer);
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    prefersDark(false);

    expect(runScript()).toBe('light');
    expect(currentTheme()).toBe('light');
  });
});
