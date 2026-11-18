import { createStore } from 'zustand';
import { createUISlice, type UISlice } from '../uiSlice';

function makeStore() {
  return createStore<UISlice>()(createUISlice);
}

describe('uiSlice >-65', () => {
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

describe('uiSlice theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute('data-theme', 'light');
  });

  it('starts with the theme the page shows', () => {
    document.documentElement.setAttribute('data-theme', 'dark');

    expect(makeStore().getState().theme).toBe('dark');
  });

  it('setTheme shows the theme and remembers it', () => {
    const store = makeStore();

    store.getState().setTheme('dark');

    expect(store.getState().theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('orbita.theme')).toBe('dark');
  });

  it('followTheme shows the theme without remembering it', () => {
    const store = makeStore();

    store.getState().followTheme('dark');

    expect(store.getState().theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('orbita.theme')).toBeNull();
  });

  it('toggleTheme switches between light and dark and remembers the choice', () => {
    const store = makeStore();

    store.getState().toggleTheme();
    expect(store.getState().theme).toBe('dark');
    store.getState().toggleTheme();
    expect(store.getState().theme).toBe('light');
    expect(localStorage.getItem('orbita.theme')).toBe('light');
  });
});
