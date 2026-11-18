import { createStore } from 'zustand';
import { createConsentSlice, type ConsentSlice } from '../consentSlice';

function makeStore() {
  return createStore<ConsentSlice>()(createConsentSlice);
}

function prefersDark(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches }));
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.setAttribute('data-theme', 'light');
  prefersDark(false);
});

afterEach(() => vi.unstubAllGlobals());

describe('consentSlice', () => {
  it('asks before the first answer', () => {
    const store = makeStore();

    expect(store.getState().storageConsent).toBeNull();
    expect(store.getState().consentPromptOpen).toBe(true);
  });

  it('does not ask again once answered', () => {
    localStorage.setItem('orbita.consent', 'denied');

    const store = makeStore();

    expect(store.getState().storageConsent).toBe('denied');
    expect(store.getState().consentPromptOpen).toBe(false);
  });

  it('accepting stores the answer and closes the question', () => {
    const store = makeStore();

    store.getState().acceptStorage();

    expect(store.getState().storageConsent).toBe('granted');
    expect(store.getState().consentPromptOpen).toBe(false);
    expect(localStorage.getItem('orbita.consent')).toBe('granted');
  });

  it('accepting remembers a theme the user picked before answering', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const store = makeStore();

    store.getState().acceptStorage();

    expect(localStorage.getItem('orbita.theme')).toBe('dark');
  });

  it('accepting stores nothing for a theme equal to the system default', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    const store = makeStore();

    store.getState().acceptStorage();

    expect(localStorage.getItem('orbita.theme')).toBeNull();
  });

  it('rejecting stores the answer and deletes what was stored', () => {
    localStorage.setItem('orbita.consent', 'granted');
    localStorage.setItem('orbita.theme', 'dark');
    localStorage.setItem('orbita.recentSearches', '["react"]');
    const store = makeStore();

    store.getState().rejectStorage();

    expect(store.getState().storageConsent).toBe('denied');
    expect(store.getState().consentPromptOpen).toBe(false);
    expect(localStorage.getItem('orbita.consent')).toBe('denied');
    expect(localStorage.getItem('orbita.theme')).toBeNull();
    expect(localStorage.getItem('orbita.recentSearches')).toBeNull();
  });

  it('can be reopened and closed without changing the answer', () => {
    localStorage.setItem('orbita.consent', 'granted');
    const store = makeStore();

    store.getState().reopenConsentPrompt();
    expect(store.getState().consentPromptOpen).toBe(true);
    store.getState().closeConsentPrompt();

    expect(store.getState().consentPromptOpen).toBe(false);
    expect(store.getState().storageConsent).toBe('granted');
  });

  it('shows the answer another tab gave', () => {
    const store = makeStore();

    localStorage.setItem('orbita.consent', 'granted');
    store.getState().syncConsent();

    expect(store.getState().storageConsent).toBe('granted');
    expect(store.getState().consentPromptOpen).toBe(false);
  });

  it('asks again when another tab removed the answer', () => {
    localStorage.setItem('orbita.consent', 'granted');
    const store = makeStore();

    localStorage.removeItem('orbita.consent');
    store.getState().syncConsent();

    expect(store.getState().storageConsent).toBeNull();
    expect(store.getState().consentPromptOpen).toBe(true);
  });
});
