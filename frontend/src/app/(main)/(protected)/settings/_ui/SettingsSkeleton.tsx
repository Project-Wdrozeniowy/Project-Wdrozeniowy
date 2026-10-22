import { SETTINGS_LOADING_LABEL } from './settingsView.const';

export default function SettingsSkeleton() {
  return (
    <div
      role="status"
      aria-label={SETTINGS_LOADING_LABEL}
      aria-busy="true"
      className="flex flex-col gap-4"
    >
      {[4, 3].map((fields) => (
        <div key={fields} className="bg-white rounded-xl p-6 flex flex-col gap-4">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}
