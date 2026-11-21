import { ChartBarIcon, CommentIcon, HomeIcon, UserIcon } from '@/shared/ui/icons';

/** One icon per page link, by its address: the top bar and the bottom bar show the same ones. */
export const NAV_ICONS: Record<string, () => React.JSX.Element> = {
  '/': HomeIcon,
  '/forum': CommentIcon,
  '/dashboard': ChartBarIcon,
  '/profile': UserIcon,
};
