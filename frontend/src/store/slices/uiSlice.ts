import type { StateCreator } from 'zustand';
import { applyTheme, readAppliedTheme, storeTheme } from '@/shared/lib/theme';
import type { Theme } from '@/shared/lib/theme';

export interface UISlice {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  /** The theme on screen. */
  theme: Theme;
  /** The user picks a theme: it is shown and remembered. */
  setTheme: (theme: Theme) => void;
  /** The system's theme changed and the user has no choice: it is shown, not remembered. */
  followTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const createUISlice: StateCreator<UISlice> = (set, get) => ({
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  theme: readAppliedTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    storeTheme(theme);
    set({ theme });
  },
  followTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
});
