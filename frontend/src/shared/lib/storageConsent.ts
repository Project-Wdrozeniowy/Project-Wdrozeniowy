import {
  CONSENT_STORAGE_KEY,
  RECENT_SEARCHES_KEY,
  THEME_STORAGE_KEY,
} from '@/shared/lib/storageKeys.const';
import type { OPTIONAL_STORAGE_KEYS } from '@/shared/lib/storageKeys.const';

export const CONSENT_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
export const CONSENT_CHANGED_EVENT = 'orbita:storage-choices-changed';
export interface StoragePermissions {
  theme: boolean;
  recentSearches: boolean;
}
export interface StorageConsent {
  version: 2;
  decidedAt: number;
  permissions: StoragePermissions;
}
export type ConsentResult =
  | { ok: true; consent: StorageConsent | null }
  | { ok: false; consent: null };
export const NO_OPTIONAL_STORAGE: StoragePermissions = { theme: false, recentSearches: false };

export function parseStorageConsent(raw: string | null, now = Date.now()): StorageConsent | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return null;
    const record = value as Partial<StorageConsent>;
    if (
      record.version !== 2 ||
      !Number.isSafeInteger(record.decidedAt) ||
      record.decidedAt! <= 0 ||
      record.decidedAt! > now ||
      now - record.decidedAt! >= CONSENT_LIFETIME_MS ||
      !record.permissions ||
      typeof record.permissions.theme !== 'boolean' ||
      typeof record.permissions.recentSearches !== 'boolean'
    )
      return null;
    return record as StorageConsent;
  } catch {
    return null;
  }
}

export function readStorageConsent(): StorageConsent | null {
  if (document.documentElement.hasAttribute('data-storage-unavailable')) return null;
  try {
    return parseStorageConsent(localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function hasStorageConsent(purpose: keyof StoragePermissions): boolean {
  return readStorageConsent()?.permissions[purpose] === true;
}

export function clearOptionalStorage(
  permissions: StoragePermissions = NO_OPTIONAL_STORAGE
): boolean {
  let ok = true;
  const keys = [
    ...(!permissions.theme ? [THEME_STORAGE_KEY] : []),
    ...(!permissions.recentSearches ? [RECENT_SEARCHES_KEY] : []),
  ];
  for (const key of keys) {
    try {
      localStorage.removeItem(key);
    } catch {
      ok = false;
    }
  }
  return ok;
}

/** Called on startup, storage changes, focus and expiry; optional values are never read here. */
export function synchronizeStorageConsent(): ConsentResult {
  // A document-local failure must not erase a valid answer shared with other tabs.
  if (document.documentElement.hasAttribute('data-storage-unavailable'))
    return { ok: false, consent: null };
  let consent: StorageConsent | null;
  try {
    consent = parseStorageConsent(localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    blockOptionalStorage();
    return { ok: false, consent: null };
  }
  let ok = clearOptionalStorage(consent?.permissions);
  if (!consent) {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch {
      ok = false;
    }
  }
  if (!ok) {
    blockOptionalStorage();
    return { ok: false, consent: null };
  }
  return { ok: true, consent };
}

export function blockOptionalStorage(): void {
  document.documentElement.setAttribute('data-storage-unavailable', '');
  clearOptionalStorage();
}

/** Persist before enabling either purpose; do not claim a successful withdrawal after failed deletion. */
export function writeStorageConsent(permissions: StoragePermissions): ConsentResult {
  const consent: StorageConsent = {
    version: 2,
    decidedAt: Date.now(),
    permissions: { ...permissions },
  };
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    if (!clearOptionalStorage(permissions)) throw new Error('Optional data could not be removed');
    document.documentElement.removeAttribute('data-storage-unavailable');
    return { ok: true, consent };
  } catch {
    blockOptionalStorage();
    return { ok: false, consent: null };
  }
}

export function notifyStorageConsentChanged(): void {
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

/** Registry stays explicit: adding a key never silently expands a previous permission. */
export const OPTIONAL_STORAGE_PURPOSES = {
  theme: [THEME_STORAGE_KEY],
  recentSearches: [RECENT_SEARCHES_KEY],
} satisfies Record<keyof StoragePermissions, readonly (typeof OPTIONAL_STORAGE_KEYS)[number][]>;
