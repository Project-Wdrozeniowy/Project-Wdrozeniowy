import {
  PROFILE_TABS,
  PROFILE_TABS_LABEL,
  PROFILE_TAB_UNAVAILABLE_LABEL,
} from '@/pages/profile/config/profileView.const';
import { cn } from '@/shared/lib/cn';

const TAB_CLASS = 'px-4 py-1.5 rounded-xl text-sm font-semibold';

/**
 * The sections of the profile. Only "Posts" has data behind it, so it is the one shown; the
 * others are in the design but cannot be opened yet, and say so.
 */
export default function ProfileTabs() {
  return (
    <ul
      aria-label={PROFILE_TABS_LABEL}
      className="bg-raised rounded-xl p-1 flex flex-wrap gap-1 self-start list-none m-0"
    >
      {PROFILE_TABS.map((tab) => (
        <li key={tab.id}>
          {tab.available ? (
            <span
              aria-current="true"
              className={cn(TAB_CLASS, 'block bg-surface text-fg shadow-sm')}
            >
              {tab.label}
            </span>
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
  );
}
