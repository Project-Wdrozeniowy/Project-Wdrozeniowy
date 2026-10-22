import SettingsView from './_ui/SettingsView';
import { SETTINGS_TITLE } from './_ui/settingsView.const';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-gray-50 font-bold text-2xl">{SETTINGS_TITLE}</h1>
      <SettingsView />
    </div>
  );
}
