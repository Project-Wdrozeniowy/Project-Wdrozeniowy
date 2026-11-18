import { useEffect, useId, useRef } from 'react';
import { useStore } from '@/store';
import ConsentDetails from './ConsentDetails';
import {
  CONSENT_ACCEPT_LABEL,
  CONSENT_CLOSE_LABEL,
  CONSENT_REJECT_LABEL,
  CONSENT_STATE_TEXT,
  CONSENT_TEXT,
  CONSENT_TITLE,
  STORAGE_SETTINGS_ID,
} from './consentBanner.const';
import { CONSENT_STORAGE_KEY } from '@/shared/lib/storageKeys.const';

const BUTTON_CLASS =
  'rounded border border-line-strong bg-raised hover:bg-raised-hover text-fg text-sm font-semibold px-4 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500';

/**
 * Asks once whether the app may store optional things on this device. It sits in the page flow
 * (not over it), so it never hides a focused control. Accepting and rejecting look the same.
 */
export default function ConsentBanner() {
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const open = useStore((state) => state.consentPromptOpen);
  const consent = useStore((state) => state.storageConsent);
  const accept = useStore((state) => state.acceptStorage);
  const reject = useStore((state) => state.rejectStorage);
  const close = useStore((state) => state.closeConsentPrompt);
  const sync = useStore((state) => state.syncConsent);

  // Another tab answered: this one shows the same answer.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === CONSENT_STORAGE_KEY || event.key === null) sync();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [sync]);

  // Reopened by the user (there is an answer already): move the focus to the question. The first
  // question does not take the focus, so it never interrupts what the visitor came to do.
  const answered = consent !== null;
  useEffect(() => {
    if (open && answered) headingRef.current?.focus();
  }, [open, answered]);

  if (!open) return null;

  // After a choice made on a reopened question, the focus goes back to the control that opened it.
  function answer(choose: () => void) {
    choose();
    if (answered) document.getElementById(STORAGE_SETTINGS_ID)?.focus();
  }

  return (
    <section aria-labelledby={titleId} className="bg-surface border-b border-line">
      <div className="max-w-282.5 mx-auto px-4 lg:px-6 py-4 flex flex-col gap-3">
        <h2
          id={titleId}
          ref={headingRef}
          tabIndex={-1}
          className="text-fg font-semibold text-base outline-none"
        >
          {CONSENT_TITLE}
        </h2>
        <p className="text-sm text-fg-muted max-w-3xl">{CONSENT_TEXT}</p>
        {consent && <p className="text-sm text-fg-subtle">{CONSENT_STATE_TEXT[consent]}</p>}
        <ConsentDetails />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => answer(accept)} className={BUTTON_CLASS}>
            {CONSENT_ACCEPT_LABEL}
          </button>
          <button type="button" onClick={() => answer(reject)} className={BUTTON_CLASS}>
            {CONSENT_REJECT_LABEL}
          </button>
          {answered && (
            <button type="button" onClick={() => answer(close)} className={BUTTON_CLASS}>
              {CONSENT_CLOSE_LABEL}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
