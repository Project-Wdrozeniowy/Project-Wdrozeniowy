import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { useStore } from '@/store';
import ConsentPreferencesDialog from './ConsentPreferencesDialog';
import {
  CONSENT_ACCEPT_LABEL,
  CONSENT_CUSTOMIZE_LABEL,
  CONSENT_REJECT_LABEL,
  CONSENT_TEXT,
  CONSENT_TITLE,
} from './consentBanner.const';
import './storagePreferences.css';

export default function ConsentBanner() {
  const id = useId();
  const panel = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  const visible = useStore((state) => state.consentPromptOpen);
  const accept = useStore((state) => state.acceptStorage);
  const reject = useStore((state) => state.rejectStorage);
  const customize = useStore((state) => state.reopenConsentPrompt);
  const close = useStore((state) => state.closeConsentPrompt);
  useEffect(() => {
    if (pathname !== previousPath.current) {
      previousPath.current = pathname;
      close();
    }
  }, [pathname, close]);
  useLayoutEffect(() => {
    const element = panel.current;
    const measure = () =>
      document.documentElement.style.setProperty(
        '--consent-panel-height',
        visible && element ? element.getBoundingClientRect().height + 'px' : '0px'
      );
    measure();
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : undefined;
    if (element) observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      document.documentElement.style.setProperty('--consent-panel-height', '0px');
    };
  }, [visible]);
  function answer(choose: () => void) {
    choose();
    if (!useStore.getState().consentDialogOpen) {
      const main = document.querySelector<HTMLElement>('main');
      main?.setAttribute('tabindex', '-1');
      main?.focus({ preventScroll: true });
    }
  }
  return (
    <>
      {visible && (
        <section ref={panel} className="storage-panel" aria-labelledby={id}>
          <div className="storage-panel-inner">
            <div className="storage-panel-copy">
              <h2 id={id}>{CONSENT_TITLE}</h2>
              <p>{CONSENT_TEXT}</p>
            </div>
            <div className="storage-actions">
              <button type="button" className="storage-action" onClick={() => answer(accept)}>
                {CONSENT_ACCEPT_LABEL}
              </button>
              <button type="button" className="storage-action" onClick={() => answer(reject)}>
                {CONSENT_REJECT_LABEL}
              </button>
              <button type="button" className="storage-text-button" onClick={customize}>
                {CONSENT_CUSTOMIZE_LABEL}
              </button>
            </div>
          </div>
        </section>
      )}
      <ConsentPreferencesDialog />
    </>
  );
}
