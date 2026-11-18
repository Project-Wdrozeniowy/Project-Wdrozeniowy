import { Link, useLocation } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { ChartBarIcon, CommentIcon, HomeIcon, UserIcon } from '@/shared/ui/icons';
import { useStore } from '@/store';
import { isActiveLink } from '@/shared/lib/isActiveLink';
import { MOBILE_PROFILE_LINK, MOBILE_TABS_LABEL, NAV_LINKS } from './header.const';

/** One icon per page link; the labels and addresses come from NAV_LINKS, so there is one list. */
const ICONS: Record<string, () => React.JSX.Element> = {
  '/': HomeIcon,
  '/forum': CommentIcon,
  '/dashboard': ChartBarIcon,
  [MOBILE_PROFILE_LINK.href]: UserIcon,
};

/** The page links on small screens, where the top bar has none. Hidden from `md` up. */
export default function MobileTabBar() {
  const pathname = useLocation().pathname;
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const tabs = isAuthenticated ? [...NAV_LINKS, MOBILE_PROFILE_LINK] : NAV_LINKS;

  return (
    <nav
      aria-label={MOBILE_TABS_LABEL}
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-header border-t border-line pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {tabs.map(({ href, label }) => {
          const Icon = ICONS[href];
          const active = isActiveLink(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                to={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 text-xs font-semibold border-t-2 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500',
                  active
                    ? 'text-accent border-accent'
                    : 'text-fg-subtle border-transparent hover:text-fg'
                )}
              >
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
