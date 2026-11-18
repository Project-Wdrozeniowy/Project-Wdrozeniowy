export const CONSENT_TITLE = 'Your storage preferences';
export const CONSENT_TEXT =
  'Orbita always keeps a session cookie so you stay signed in. With your permission it can also ' +
  'remember your theme and your recent searches on this device. Nothing optional is stored until ' +
  'you choose.';
export const CONSENT_ACCEPT_LABEL = 'Accept optional storage';
export const CONSENT_REJECT_LABEL = 'Reject optional storage';
export const CONSENT_CLOSE_LABEL = 'Close';
export const CONSENT_DETAILS_LABEL = 'What is stored';
export const STORAGE_SETTINGS_LABEL = 'Storage settings';
export const STORAGE_SETTINGS_ID = 'storage-settings-button';
export const CONSENT_STATE_TEXT = {
  granted: 'You accepted optional storage. You can change this at any time.',
  denied: 'You rejected optional storage. You can change this at any time.',
} as const;

export interface StorageItem {
  id: string;
  name: string;
  purpose: string;
  optional: boolean;
}

/** Everything the app stores in this browser. Keep in step with shared/lib/storageKeys.const.ts. */
export const STORAGE_ITEMS: readonly StorageItem[] = [
  {
    id: 'session',
    name: 'Session cookie (SESSION)',
    purpose: 'Keeps you signed in. It is deleted when your session ends. Always used.',
    optional: false,
  },
  {
    id: 'consent',
    name: 'Your answer (orbita.consent)',
    purpose: 'Remembers this choice so we do not ask again.',
    optional: false,
  },
  {
    id: 'theme',
    name: 'Theme (orbita.theme)',
    purpose: 'Remembers whether you chose the light or the dark theme.',
    optional: true,
  },
  {
    id: 'searches',
    name: 'Recent searches (orbita.recentSearches)',
    purpose: 'Remembers the last words you searched for, to suggest them again.',
    optional: true,
  },
];
