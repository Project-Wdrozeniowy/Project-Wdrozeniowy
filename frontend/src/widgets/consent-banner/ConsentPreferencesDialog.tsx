import { useEffect, useId, useRef, useState } from 'react';
import { useStore } from '@/store';
import { NO_OPTIONAL_STORAGE } from '@/shared/lib/storageConsent';
import ConsentDetails from './ConsentDetails';
import { OPTIONAL_ITEMS, STORAGE_DIALOG_ID, STORAGE_SETTINGS_LABEL } from './consentBanner.const';

interface PreferencesFormProps {
  titleId: string;
}
function PreferencesForm({ titleId }: PreferencesFormProps) {
  const initial = useStore.getState();
  const [draft, setDraft] = useState({
    ...(initial.pendingStorageChoices ??
      initial.storageConsent?.permissions ??
      NO_OPTIONAL_STORAGE),
  });
  const error = useStore((state) => state.storageConsentError);
  const notice = useStore((state) => state.storageConsentNotice);
  const save = useStore((state) => state.saveStorageChoices);
  const close = useStore((state) => state.closeConsentPrompt);
  const id = useId();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save(draft);
      }}
    >
      <div className="storage-dialog-body">
        <div className="storage-dialog-header">
          <h2 id={titleId} tabIndex={-1}>
            {STORAGE_SETTINGS_LABEL}
          </h2>
          <button type="button" className="storage-close" aria-label="Close" onClick={close}>
            ×
          </button>
        </div>
        <p className="storage-description">
          Control what Orbita remembers on this device. You can change your choices at any time.
        </p>
        {notice && (
          <p role="status" className="storage-notice">
            {notice}
          </p>
        )}
        <p className="storage-section-label">Necessary</p>
        <ConsentDetails />
        <p className="storage-section-label storage-optional-title">Optional</p>
        {OPTIONAL_ITEMS.map((item) => (
          <div className="storage-option" key={item.id}>
            <div>
              <label htmlFor={id + item.id}>{item.name}</label>
              <p id={id + item.id + '-description'}>{item.purpose}</p>
            </div>
            <input
              id={id + item.id}
              className="storage-switch"
              type="checkbox"
              role="switch"
              aria-describedby={id + item.id + '-description'}
              checked={draft[item.id]}
              onChange={(event) => setDraft({ ...draft, [item.id]: event.target.checked })}
            />
          </div>
        ))}
        {error && (
          <p role="alert" className="storage-error">
            {error}
          </p>
        )}
      </div>
      <div className="storage-dialog-footer">
        <span className="storage-retention">
          Choices expire after 180 days. Visits do not extend this period.
        </span>
        <button type="submit" className="storage-action storage-save">
          Save choices
        </button>
      </div>
    </form>
  );
}

export default function ConsentPreferencesDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const open = useStore((state) => state.consentDialogOpen);
  const revision = useStore((state) => state.consentRevision);
  const close = useStore((state) => state.closeConsentPrompt);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    element.querySelector<HTMLElement>('h2')?.focus();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
      else {
        const main = document.querySelector<HTMLElement>('main');
        main?.setAttribute('tabindex', '-1');
        main?.focus({ preventScroll: true });
      }
    };
  }, [open]);
  useEffect(() => {
    // A cross-tab update remounts the draft. Keep focus inside the new form.
    if (open) dialog.current?.querySelector<HTMLElement>('h2')?.focus();
  }, [open, revision]);
  return (
    <dialog
      ref={dialog}
      id={STORAGE_DIALOG_ID}
      className="storage-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      {open && <PreferencesForm key={revision} titleId={titleId} />}
    </dialog>
  );
}
