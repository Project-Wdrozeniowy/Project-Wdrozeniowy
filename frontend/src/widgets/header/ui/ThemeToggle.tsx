import { MoonIcon, SunIcon } from '@/shared/ui/icons';
import { useStore } from '@/store';

/** Switches between the light and the dark theme; the choice is remembered in this browser. */
export default function ThemeToggle() {
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="p-2 rounded text-fg hover:bg-raised transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
