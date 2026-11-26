import { createStore } from 'zustand';
import { createConsentSlice, type ConsentSlice } from '../consentSlice';
import { createUISlice, type UISlice } from '../uiSlice';
import { seedStorageConsent } from '@/test/storageConsent';
function makeStore() {
  return createStore<ConsentSlice & UISlice>()((...args) => ({
    ...createUISlice(...args),
    ...createConsentSlice(...args),
  }));
}
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  seedStorageConsent(false);
  localStorage.clear();
  document.documentElement.dataset.theme = 'light';
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
});
afterEach(() => vi.unstubAllGlobals());
it('asks before the first answer', () => {
  expect(makeStore().getState().consentPromptOpen).toBe(true);
});
it('recognises an existing refusal', () => {
  seedStorageConsent(false);
  expect(makeStore().getState().consentPromptOpen).toBe(false);
});
it('accepts and rejects all purposes', () => {
  const store = makeStore();
  store.getState().acceptStorage();
  expect(store.getState().storageConsent?.permissions).toEqual({
    theme: true,
    recentSearches: true,
  });
  store.getState().rejectStorage();
  expect(store.getState().storageConsent?.permissions).toEqual({
    theme: false,
    recentSearches: false,
  });
});
it('reopens and cancels without changing saved choices', () => {
  seedStorageConsent();
  const store = makeStore();
  store.getState().reopenConsentPrompt();
  store.getState().closeConsentPrompt();
  expect(store.getState().consentDialogOpen).toBe(false);
  expect(store.getState().storageConsent?.permissions.theme).toBe(true);
});
it('asks again when another tab removes the answer', () => {
  seedStorageConsent();
  const store = makeStore();
  localStorage.removeItem('orbita.consent');
  store.getState().syncConsent();
  expect(store.getState().storageConsent).toBeNull();
  expect(store.getState().consentPromptOpen).toBe(true);
});
