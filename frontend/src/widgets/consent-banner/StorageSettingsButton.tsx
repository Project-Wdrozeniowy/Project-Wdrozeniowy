import { useStore } from '@/store';
import {
  STORAGE_DIALOG_ID,
  STORAGE_SETTINGS_ID,
  STORAGE_SETTINGS_LABEL,
} from './consentBanner.const';
export default function StorageSettingsButton() {
  const open = useStore((state) => state.consentDialogOpen);
  const reopen = useStore((state) => state.reopenConsentPrompt);
  return (
    <button
      id={STORAGE_SETTINGS_ID}
      type="button"
      onClick={reopen}
      aria-haspopup="dialog"
      aria-controls={STORAGE_DIALOG_ID}
      aria-expanded={open}
      className="text-sm text-fg-subtle hover:text-fg underline focus-visible:outline-2 focus-visible:outline-blue-500"
    >
      {STORAGE_SETTINGS_LABEL}
    </button>
  );
}
