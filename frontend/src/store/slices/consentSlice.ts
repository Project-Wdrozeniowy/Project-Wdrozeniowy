import type { StateCreator } from 'zustand';
import {
  blockOptionalStorage,
  notifyStorageConsentChanged,
  readStorageConsent,
  synchronizeStorageConsent,
  writeStorageConsent,
} from '@/shared/lib/storageConsent';
import type { StorageConsent, StoragePermissions } from '@/shared/lib/storageConsent';
import { storeTheme } from '@/shared/lib/theme';
import type { UISlice } from './uiSlice';

export const STORAGE_SAVE_ERROR =
  "We couldn't save your choices or remove optional data. Optional storage is off in this tab. Try saving again.";
export interface ConsentSlice {
  storageConsent: StorageConsent | null;
  consentPromptOpen: boolean;
  consentDialogOpen: boolean;
  storageConsentError: string | null;
  consentRevision: number;
  storageConsentNotice: string | null;
  pendingStorageChoices: StoragePermissions | null;
  saveStorageChoices: (permissions: StoragePermissions) => boolean;
  acceptStorage: () => void;
  rejectStorage: () => void;
  reopenConsentPrompt: () => void;
  closeConsentPrompt: () => void;
  syncConsent: () => void;
}

export const createConsentSlice: StateCreator<ConsentSlice & UISlice, [], [], ConsentSlice> = (
  set,
  get
) => {
  const initial = readStorageConsent();
  return {
    storageConsent: initial,
    consentPromptOpen: initial === null,
    consentDialogOpen: false,
    storageConsentError: null,
    consentRevision: 0,
    storageConsentNotice: null,
    pendingStorageChoices: null,
    saveStorageChoices: (permissions) => {
      const previous = get().storageConsent;
      const selectedTheme = get().themeChoice;
      const result = writeStorageConsent(permissions);
      if (
        !result.ok ||
        !result.consent ||
        (permissions.theme && selectedTheme !== null && !storeTheme(selectedTheme))
      ) {
        blockOptionalStorage();
        set({
          storageConsent: null,
          consentPromptOpen: true,
          consentDialogOpen: true,
          storageConsentError: STORAGE_SAVE_ERROR,
          pendingStorageChoices: { ...permissions },
        });
        notifyStorageConsentChanged();
        return false;
      }
      if (previous?.permissions.theme && !permissions.theme) get().resetThemeChoice();
      set({
        storageConsent: result.consent,
        consentPromptOpen: false,
        consentDialogOpen: false,
        storageConsentError: null,
        consentRevision: get().consentRevision + 1,
        storageConsentNotice: null,
        pendingStorageChoices: null,
      });
      notifyStorageConsentChanged();
      return true;
    },
    acceptStorage: () => {
      get().saveStorageChoices({ theme: true, recentSearches: true });
    },
    rejectStorage: () => {
      get().saveStorageChoices({ theme: false, recentSearches: false });
    },
    reopenConsentPrompt: () => {
      get().syncConsent();
      set({ consentDialogOpen: true, storageConsentNotice: null, pendingStorageChoices: null });
    },
    closeConsentPrompt: () => set({ consentDialogOpen: false }),
    syncConsent: () => {
      const previous = get().storageConsent;
      const result = synchronizeStorageConsent();
      const consent = result.consent;
      if (previous?.permissions.theme && !consent?.permissions.theme) get().resetThemeChoice();
      const changed = JSON.stringify(previous) !== JSON.stringify(consent);
      set({
        storageConsent: consent,
        consentPromptOpen: consent === null,
        ...(changed ? { consentRevision: get().consentRevision + 1 } : {}),
        ...(changed && get().consentDialogOpen
          ? {
              storageConsentNotice: consent
                ? 'Your choices changed in another tab. Review them before saving.'
                : 'Your saved choices are no longer valid. Review them before saving.',
              pendingStorageChoices: null,
            }
          : {}),
        ...(!result.ok ? { storageConsentError: STORAGE_SAVE_ERROR } : {}),
      });
      notifyStorageConsentChanged();
    },
  };
};
