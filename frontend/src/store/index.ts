import { create } from 'zustand';
import type { UISlice } from './slices/uiSlice';
import { createUISlice } from './slices/uiSlice';
import type { AuthSlice } from './slices/authSlice';
import { createAuthSlice } from './slices/authSlice';
import type { ConsentSlice } from './slices/consentSlice';
import { createConsentSlice } from './slices/consentSlice';

export type StoreState = UISlice & AuthSlice & ConsentSlice;

export const useStore = create<StoreState>()((...a) => ({
  ...createUISlice(...a),
  ...createAuthSlice(...a),
  ...createConsentSlice(...a),
}));
