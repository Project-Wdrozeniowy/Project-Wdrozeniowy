import {
  BellIcon,
  ChartBarIcon,
  CommentIcon,
  HomeIcon,
  SettingsIcon,
  UserIcon,
} from '@/shared/ui/icons';

/**
 * The icon of each page the shell links to, by its address. One table for the top bar, the bottom
 * bar and the user card, so a page has one icon. A link whose address is typed as one of these
 * keys cannot lack an icon; the compiler says so.
 */
export const PAGE_ICONS = {
  '/': HomeIcon,
  '/forum': CommentIcon,
  '/dashboard': ChartBarIcon,
  '/profile': UserIcon,
  '/notifications': BellIcon,
  '/settings': SettingsIcon,
} as const;

export type PageAddress = keyof typeof PAGE_ICONS;

/** For a link whose address is only known as a string: its icon, or `undefined` for another page. */
export function pageIcon(href: string): (() => React.JSX.Element) | undefined {
  // Own keys only: an address like "constructor" must not find a property of Object.
  return Object.hasOwn(PAGE_ICONS, href) ? PAGE_ICONS[href as PageAddress] : undefined;
}
