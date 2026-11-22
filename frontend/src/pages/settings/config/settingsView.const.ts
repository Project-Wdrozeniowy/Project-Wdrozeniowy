import type { ProfileField } from '@/features/edit-profile/profile.const';

export const SETTINGS_TITLE = 'Settings';
export const SETTINGS_SUBTITLE = 'Manage your account settings and preferences';
export const SETTINGS_BACK_LABEL = 'View profile';
export const SETTINGS_LOADING_LABEL = 'Loading your settings';
export const SETTINGS_NAV_LABEL = 'Settings sections';
export const SETTINGS_UNAVAILABLE_LABEL = 'Not available yet';

/**
 * The tabs of the design. PROVISIONAL: only the ones the backend supports can be opened; the others
 * are shown, cannot be opened, and say so (nothing is simulated, and nothing is sent to
 * `PATCH /users/me` for them). Dependencies, none with a ticket yet:
 *
 * - notifications: there is no API for notification preferences (e-mail or in-app).
 * - appearance: the theme is a local choice made with the toggle in the header (after the storage
 *   consent). A section here would only repeat it, so it waits for a product decision (a "System"
 *   option is also open).
 * - privacy: there is no API for privacy preferences.
 * - content: there is no API for content preferences.
 * - profile picture upload, location, website: the API has an avatar link (`avatarUrl`) and no file
 *   upload, location or website; the profile section shows the upload as not available yet.
 * - delete account: there is no endpoint; the danger zone says so and has no working button.
 *
 * When one exists: make its entry `available`, give it a form that shares `ProfileForm`'s
 * validation, save path and cache where it edits the profile, and drop its note here.
 */
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
