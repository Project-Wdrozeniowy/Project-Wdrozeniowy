import { useEffect } from 'react';
import { useStore } from '@/store';
import { CONSENT_LIFETIME_MS } from '@/shared/lib/storageConsent';
import { CONSENT_STORAGE_KEY, OPTIONAL_STORAGE_KEYS } from '@/shared/lib/storageKeys.const';

/** One owner for cross-tab updates, bfcache/focus revalidation and active-page expiry. */
export default function StorageConsentProvider() {
  const sync = useStore((state) => state.syncConsent);
  const decidedAt = useStore((state) => state.storageConsent?.decidedAt);
  useEffect(() => {
    sync();
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === CONSENT_STORAGE_KEY ||
        OPTIONAL_STORAGE_KEYS.some((key) => key === event.key)
      )
        sync();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', sync);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', sync);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sync]);
  useEffect(() => {
    if (decidedAt === undefined) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const current = useStore.getState().storageConsent;
      if (!current) return;
      // Browsers clamp larger delays to a signed 32-bit integer. Recheck and reschedule.
      const remaining = current.decidedAt + CONSENT_LIFETIME_MS - Date.now();
      timer = setTimeout(
        () => {
          sync();
          schedule();
        },
        Math.max(0, Math.min(remaining, 2_147_483_647))
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, [decidedAt, sync]);
  return null;
}
