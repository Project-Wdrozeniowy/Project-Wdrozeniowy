import { seedStorageConsent } from '@/test/storageConsent';
import { act, render } from '@testing-library/react';
import { vi } from 'vitest';
import ThemeProvider from '@/app/providers/ThemeProvider';
import { THEME_STORAGE_KEY } from '@/shared/lib/theme';
import { useStore } from '@/store';

type Listener = () => void;
let listeners: Listener[] = [];
let systemDark = false;
const query = {
  get matches() {
    return systemDark;
  },
  addEventListener: vi.fn((_type: string, listener: Listener) => listeners.push(listener)),
  removeEventListener: vi.fn((_type: string, listener: Listener) => {
    listeners = listeners.filter((item) => item !== listener);
  }),
};

const shown = () => document.documentElement.getAttribute('data-theme');

function systemChanges(dark: boolean) {
  systemDark = dark;
  act(() => listeners.forEach((listener) => listener()));
}

beforeEach(() => {
  listeners = [];
  systemDark = false;
  localStorage.clear();
  seedStorageConsent();
  document.documentElement.removeAttribute('data-theme');
  useStore.setState({ theme: 'light', themeChoice: null });
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(query));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('ThemeProvider', () => {
  it('shows the system theme when the user never chose', () => {
    systemDark = true;

    render(<ThemeProvider />);

    expect(shown()).toBe('dark');
    expect(useStore.getState().theme).toBe('dark');
  });

  it('shows the stored choice over the system', () => {
    systemDark = true;
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    render(<ThemeProvider />);

    expect(shown()).toBe('light');
  });

  it('follows the system while the user has no choice, without storing anything', () => {
    render(<ThemeProvider />);

    systemChanges(true);

    expect(shown()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('ignores the system once the user chose', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    render(<ThemeProvider />);

    systemChanges(true);

    expect(shown()).toBe('light');
  });

  it('follows a choice made in another tab', () => {
    render(<ThemeProvider />);

    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY }));
    });

    expect(shown()).toBe('dark');
  });

  it('ignores storage changes of other keys', () => {
    render(<ThemeProvider />);

    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'orbita.recentSearches' }));
    });

    expect(shown()).toBe('light');
  });

  it('stops listening when it unmounts', () => {
    const { unmount } = render(<ThemeProvider />);
    expect(listeners).toHaveLength(1);

    unmount();

    expect(listeners).toHaveLength(0);
  });

  it('works where matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(() => render(<ThemeProvider />)).not.toThrow();
    expect(shown()).toBe('light');
  });

  it('stops showing the stored theme when the permission is withdrawn in another tab', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(<ThemeProvider />);
    expect(shown()).toBe('dark');

    seedStorageConsent(false);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'orbita.consent' }));
    });

    expect(shown()).toBe('light');
  });
});
