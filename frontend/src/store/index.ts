import { create } from 'zustand';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createAuthSlice, AuthSlice } from './slices/authSlice';

export type StoreState = UISlice & AuthSlice;

export const useStore = create<StoreState>()((...a) => ({
  ...createUISlice(...a),
  ...createAuthSlice(...a),
}));
