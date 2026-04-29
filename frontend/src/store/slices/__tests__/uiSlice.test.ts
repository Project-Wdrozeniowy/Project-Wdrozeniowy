import { createStore } from 'zustand';
import { createUISlice, type UISlice } from '../uiSlice';

function makeStore() {
  return createStore<UISlice>()(createUISlice);
}

describe('uiSlice', () => {
  it('has isLoading false by default', () => {
    const store = makeStore();
    expect(store.getState().isLoading).toBe(false);
  });

  it('setLoading(true) sets isLoading to true', () => {
    const store = makeStore();
    store.getState().setLoading(true);
    expect(store.getState().isLoading).toBe(true);
  });

  it('setLoading(false) resets isLoading to false', () => {
    const store = makeStore();
    store.getState().setLoading(true);
    store.getState().setLoading(false);
    expect(store.getState().isLoading).toBe(false);
  });
});
