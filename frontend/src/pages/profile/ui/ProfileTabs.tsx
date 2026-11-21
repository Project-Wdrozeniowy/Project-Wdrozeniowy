import { Link } from 'react-router';
import { profileTabHref } from '@/pages/profile/lib/profileTab';
import {
  PROFILE_SETTINGS_LINK,
  PROFILE_TABS,
  PROFILE_TABS_LABEL,
  PROFILE_TAB_UNAVAILABLE_LABEL,
} from '@/pages/profile/config/profileView.const';
import type { ProfileTabId } from '@/pages/profile/config/profileView.const';
import { cn } from '@/shared/lib/cn';
import { SettingsIcon } from '@/shared/ui/icons';

const TAB_CLASS = 'px-4 py-1.5 rounded-xl text-sm font-semibold';
const FOCUS_CLASS = 'focus-visible:outline-2 focus-visible:outline-blue-500';

interface ProfileTabsProps {
  active: ProfileTabId;
}

/**
 * The sections of the profile. An open one is a link (`?tab=`), so a reload and the back button keep
 * it. One without data is shown and says so. The last entry goes to the settings, as in the design.
 */
export default function ProfileTabs({ active }: ProfileTabsProps) {
  return (
    <div className="bg-raised rounded-xl p-1 flex flex-wrap gap-1 self-start max-w-full">
      <nav aria-label={PROFILE_TABS_LABEL} className="contents">
        <ul className="flex flex-wrap gap-1 list-none m-0 p-0">
          {PROFILE_TABS.map((tab) => (
            <li key={tab.id}>
              {tab.available ? (
                <Link
                  to={profileTabHref(tab.id)}
                  aria-current={tab.id === active ? 'page' : undefined}
                  className={cn(
                    TAB_CLASS,
                    FOCUS_CLASS,
                    'block',
                    tab.id === active
                      ? 'bg-surface text-fg shadow-sm'
                      : 'text-fg-soft hover:text-fg hover:bg-raised-hover'
                  )}
                >
                  {tab.label}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  title={PROFILE_TAB_UNAVAILABLE_LABEL}
                  className={cn(TAB_CLASS, 'block text-fg-subtle opacity-70 cursor-not-allowed')}
                >
                  {tab.label}
                  <span className="sr-only"> ({PROFILE_TAB_UNAVAILABLE_LABEL})</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
      {/* Not a section but the way to another page, so it is outside the list of sections. */}
      <Link
        to={PROFILE_SETTINGS_LINK.to}
        className={cn(
          TAB_CLASS,
          FOCUS_CLASS,
          'flex items-center gap-2 text-fg-soft hover:text-fg hover:bg-raised-hover'
        )}
      >
        <SettingsIcon />
        {PROFILE_SETTINGS_LINK.label}
      </Link>
    </div>
  );
}
