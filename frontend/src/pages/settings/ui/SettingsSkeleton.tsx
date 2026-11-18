import { SETTINGS_LOADING_LABEL } from '@/pages/settings/config/settingsView.const';

export default function SettingsSkeleton() {
  return (
    <div
      role="status"
      aria-label={SETTINGS_LOADING_LABEL}
      aria-busy="true"
      className="flex flex-col gap-4"
    >
      {[4, 3].map((fields) => (
        <div
          key={fields}
          className="bg-surface rounded-xl p-6 flex flex-col gap-4 border border-line"
        >
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="h-10 bg-raised rounded animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}
