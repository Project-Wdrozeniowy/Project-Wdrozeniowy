import { create } from 'zustand';
import type { UISlice } from './slices/uiSlice';
import { createUISlice } from './slices/uiSlice';
import type { AuthSlice } from './slices/authSlice';
import { createAuthSlice } from './slices/authSlice';

export type StoreState = UISlice & AuthSlice;

export const useStore = create<StoreState>()((...a) => ({
  ...createUISlice(...a),
  ...createAuthSlice(...a),
}));
