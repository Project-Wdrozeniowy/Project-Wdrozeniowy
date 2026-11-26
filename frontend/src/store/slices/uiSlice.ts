import type { StateCreator } from 'zustand';
import {
  applyTheme,
  readAppliedTheme,
  readStoredTheme,
  storeTheme,
  systemTheme,
} from '@/shared/lib/theme';
import type { Theme } from '@/shared/lib/theme';
export interface UISlice {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  theme: Theme;
  /** Explicit selection, independent from the theme currently applied by the system. */
  themeChoice: Theme | null;
  setTheme: (theme: Theme) => void;
  followTheme: (theme: Theme) => void;
  resetThemeChoice: () => void;
  toggleTheme: () => void;
}
export const createUISlice: StateCreator<UISlice> = (set, get) => ({
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  theme: readAppliedTheme(),
  themeChoice: readStoredTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    storeTheme(theme);
    set({ theme, themeChoice: theme });
  },
  followTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  resetThemeChoice: () => {
    const theme = systemTheme();
    applyTheme(theme);
    set({ theme, themeChoice: null });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
});
