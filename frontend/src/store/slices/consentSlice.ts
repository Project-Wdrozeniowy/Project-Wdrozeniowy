import type { StateCreator } from 'zustand';
import {
  clearOptionalStorage,
  readStorageConsent,
  writeStorageConsent,
} from '@/shared/lib/storageConsent';
import type { StorageConsent } from '@/shared/lib/storageConsent';
import { readAppliedTheme, storeTheme, systemTheme } from '@/shared/lib/theme';

export interface ConsentSlice {
  /** The user's answer about optional storage; `null` until they answered. */
  storageConsent: StorageConsent | null;
  /** The question is on screen: before the first answer, and whenever the user reopens it. */
  consentPromptOpen: boolean;
  acceptStorage: () => void;
  /** Rejecting, or withdrawing an earlier acceptance, also deletes what was stored. */
  rejectStorage: () => void;
  reopenConsentPrompt: () => void;
  closeConsentPrompt: () => void;
  /** Another tab answered: show its answer here. */
  syncConsent: () => void;
}

export const createConsentSlice: StateCreator<ConsentSlice> = (set) => ({
  storageConsent: readStorageConsent(),
  consentPromptOpen: readStorageConsent() === null,
  acceptStorage: () => {
    writeStorageConsent('granted');
    // A theme picked before answering was only on screen: remember it now. A theme equal to the
    // system's is the default anyway, so nothing is stored for it.
    if (readAppliedTheme() !== systemTheme()) storeTheme(readAppliedTheme());
    set({ storageConsent: 'granted', consentPromptOpen: false });
  },
  rejectStorage: () => {
    writeStorageConsent('denied');
    clearOptionalStorage();
    set({ storageConsent: 'denied', consentPromptOpen: false });
  },
  reopenConsentPrompt: () => set({ consentPromptOpen: true }),
  closeConsentPrompt: () => set({ consentPromptOpen: false }),
  syncConsent: () => {
    const storageConsent = readStorageConsent();
    set({ storageConsent, consentPromptOpen: storageConsent === null });
  },
});
