import { DANGER_ZONE_TEXT, DANGER_ZONE_TITLE } from '@/pages/settings/config/settingsView.const';

/** In the design; there is no API to delete an account yet, so the action is shown but inert. */
export default function DangerZone() {
  return (
    <section
      aria-labelledby="danger-zone-title"
      className="bg-white rounded-xl p-6 flex flex-col gap-3 border border-red-300"
    >
      <h2 id="danger-zone-title" className="text-red-600 font-semibold text-lg">
        {DANGER_ZONE_TITLE}
      </h2>
      <p id="danger-zone-text" className="text-gray-500 text-sm">
        {DANGER_ZONE_TEXT}
      </p>
      <button
        type="button"
        aria-disabled="true"
        aria-describedby="danger-zone-text"
        className="bg-red-500 text-white font-semibold text-sm px-5 py-2 rounded opacity-50 cursor-not-allowed"
      >
        Delete account
      </button>
    </section>
  );
}
