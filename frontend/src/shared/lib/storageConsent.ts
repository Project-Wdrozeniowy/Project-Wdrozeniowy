import { CONSENT_STORAGE_KEY, OPTIONAL_STORAGE_KEYS } from '@/shared/lib/storageKeys.const';

export type StorageConsent = 'granted' | 'denied';

/**
 * The user's answer, or `null` when they have not answered. Storage can be missing or blocked, so
 * every access is guarded; without a readable answer nothing optional is stored.
 */
export function readStorageConsent(): StorageConsent | null {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    return stored === 'granted' || stored === 'denied' ? stored : null;
  } catch {
    return null;
  }
}

export function writeStorageConsent(consent: StorageConsent): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, consent);
  } catch {
    // Not remembered: the banner asks again next visit, and nothing optional is stored meanwhile.
  }
}

/** Optional storage may be written and read only after the user accepted it. */
export function hasStorageConsent(): boolean {
  return readStorageConsent() === 'granted';
}

/** Deletes everything optional, for a rejection or a withdrawal. */
export function clearOptionalStorage(): void {
  for (const key of OPTIONAL_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to delete where storage is blocked.
    }
  }
}
