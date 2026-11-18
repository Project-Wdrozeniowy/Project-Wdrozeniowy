import type { ProfileField } from '@/features/edit-profile/profile.const';

export const SETTINGS_TITLE = 'Settings';
export const SETTINGS_SUBTITLE = 'Manage your account settings and preferences';
export const SETTINGS_LOADING_LABEL = 'Loading your settings';
export const SETTINGS_NAV_LABEL = 'Settings sections';
export const SETTINGS_UNAVAILABLE_LABEL = 'Not available yet';

/** The tabs of the design. Only the ones the backend supports can be opened. */
export const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'Profile', available: true },
  { id: 'account', label: 'Account', available: true },
  { id: 'notifications', label: 'Notifications', available: false },
  { id: 'appearance', label: 'Appearance', available: false },
  { id: 'privacy', label: 'Privacy', available: false },
  { id: 'content', label: 'Content', available: false },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id'];
/** Derived, so a section cannot be marked available without being usable as one. */
export type OpenSettingsSection = Extract<(typeof SETTINGS_SECTIONS)[number], { available: true }>;
export type OpenSettingsSectionId = OpenSettingsSection['id'];

export const DEFAULT_SETTINGS_SECTION: OpenSettingsSectionId = 'profile';

export const PROFILE_SECTION_TITLE = 'Profile information';
export const ACCOUNT_SECTION_TITLE = 'Account settings';
export const PROFILE_SECTION_FIELDS: readonly ProfileField[] = ['displayName', 'avatarUrl', 'bio'];
export const ACCOUNT_SECTION_FIELDS: readonly ProfileField[] = ['email'];

export const DANGER_ZONE_TITLE = 'Danger zone';
export const DANGER_ZONE_TEXT =
  'Deleting your account is not available yet. Nothing is deleted from this page.';
