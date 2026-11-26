export const CONSENT_TITLE = 'Your storage preferences';
export const CONSENT_TEXT =
  'Choose whether Orbita remembers your theme and recent searches on this device. Optional storage stays off until you choose.';
export const CONSENT_ACCEPT_LABEL = 'Accept all';
export const CONSENT_REJECT_LABEL = 'Reject all';
export const CONSENT_CUSTOMIZE_LABEL = 'Customize';
export const STORAGE_SETTINGS_LABEL = 'Storage settings';
export const STORAGE_SETTINGS_ID = 'storage-settings-button';
export const STORAGE_DIALOG_ID = 'storage-preferences-dialog';
export const STORAGE_ITEMS = [
  {
    id: 'session',
    name: 'Secure session',
    purpose: 'Supports sign-in, protects actions and keeps sign-in status consistent across tabs.',
  },
  {
    id: 'choices',
    name: 'Your choices',
    purpose: 'Remembers these storage settings for 180 days.',
  },
  {
    id: 'navigation',
    name: 'Navigation position',
    purpose: 'Restores your place when you return to a page or reload it, within this tab.',
  },
] as const;
export const OPTIONAL_ITEMS = [
  {
    id: 'theme',
    name: 'Remember theme',
    purpose: 'Remembers your light or dark theme on this device.',
  },
  {
    id: 'recentSearches',
    name: 'Recent searches',
    purpose: 'Remembers your last five searches on this device for reuse.',
  },
] as const;
