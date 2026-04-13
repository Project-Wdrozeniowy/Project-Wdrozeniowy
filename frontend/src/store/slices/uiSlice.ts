import { StateCreator } from 'zustand';

export interface UISlice {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
});
