import { Link } from 'react-router';
import {
  SETTINGS_NAV_LABEL,
  SETTINGS_SECTIONS,
  SETTINGS_UNAVAILABLE_LABEL,
} from '@/pages/settings/config/settingsView.const';
import type { SettingsSectionId } from '@/pages/settings/config/settingsView.const';
import { cn } from '@/shared/lib/cn';

const TAB_CLASS = 'px-4 py-1.5 rounded-xl text-sm font-semibold text-center';

interface SettingsTabsProps {
  active: SettingsSectionId;
}

/**
 * The sections are real links (one URL each), so the browser's back button and bookmarks work.
 * A section the backend cannot serve yet is shown, but cannot be opened.
 */
export default function SettingsTabs({ active }: SettingsTabsProps) {
  return (
    <nav aria-label={SETTINGS_NAV_LABEL}>
      <ul className="bg-raised rounded-xl p-1 flex flex-wrap gap-1 list-none m-0">
        {SETTINGS_SECTIONS.map((section) => (
          <li key={section.id} className="flex-auto">
            {section.available ? (
              <Link
                to={`/settings/${section.id}`}
                aria-current={active === section.id ? 'page' : undefined}
                className={cn(
                  TAB_CLASS,
                  'block focus-visible:outline-2 focus-visible:outline-blue-500',
                  active === section.id
                    ? 'bg-surface text-fg shadow-sm'
                    : 'text-fg-subtle hover:text-fg'
                )}
              >
                {section.label}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                title={SETTINGS_UNAVAILABLE_LABEL}
                className={cn(TAB_CLASS, 'block text-fg-subtle cursor-not-allowed')}
              >
                {section.label}
                <span className="sr-only"> ({SETTINGS_UNAVAILABLE_LABEL})</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
