import { Navigate, useParams } from 'react-router';
import SettingsTabs from './SettingsTabs';
import SettingsView from './SettingsView';
import {
  DEFAULT_SETTINGS_SECTION,
  SETTINGS_SECTIONS,
  SETTINGS_SUBTITLE,
  SETTINGS_TITLE,
} from '@/pages/settings/config/settingsView.const';
import type {
  OpenSettingsSection,
  OpenSettingsSectionId,
} from '@/pages/settings/config/settingsView.const';

/** Only the sections that can be opened; a typo or a section that is not available yet is not one. */
function openSection(value: string | undefined): OpenSettingsSectionId | null {
  const found = SETTINGS_SECTIONS.find(
    (section): section is OpenSettingsSection => section.id === value && section.available
  );
  return found?.id ?? null;
}

export default function SettingsPage() {
  const { section: param } = useParams();
  const section = openSection(param);

  if (!section) {
    return <Navigate to={`/settings/${DEFAULT_SETTINGS_SECTION}`} replace />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-fg font-bold text-2xl">{SETTINGS_TITLE}</h1>
        <p className="text-fg-subtle text-sm">{SETTINGS_SUBTITLE}</p>
      </div>
      <SettingsTabs active={section} />
      <SettingsView section={section} />
    </div>
  );
}
