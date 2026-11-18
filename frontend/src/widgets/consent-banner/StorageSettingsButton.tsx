import { useStore } from '@/store';
import { STORAGE_SETTINGS_ID, STORAGE_SETTINGS_LABEL } from './consentBanner.const';

/** Reopens the storage question, so the answer can be changed or withdrawn at any time. */
export default function StorageSettingsButton() {
  const reopen = useStore((state) => state.reopenConsentPrompt);
  const open = useStore((state) => state.consentPromptOpen);

  return (
    <button
      id={STORAGE_SETTINGS_ID}
      type="button"
      onClick={reopen}
      aria-expanded={open}
      className="text-sm text-fg-subtle hover:text-fg underline focus-visible:outline-2 focus-visible:outline-blue-500"
    >
      {STORAGE_SETTINGS_LABEL}
    </button>
  );
}
