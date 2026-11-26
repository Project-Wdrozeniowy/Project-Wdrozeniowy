import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsentBanner from '@/widgets/consent-banner/ConsentBanner';
import StorageSettingsButton from '@/widgets/consent-banner/StorageSettingsButton';
import { createConsentSlice } from '@/store/slices/consentSlice';
import { createUISlice } from '@/store/slices/uiSlice';
import { useStore } from '@/store';
import { seedStorageConsent } from '@/test/storageConsent';
import { writeStorageConsent } from '@/shared/lib/storageConsent';

beforeAll(() => {
  // jsdom does not implement native modality. Actual focus containment is covered in real Chromium E2E.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  seedStorageConsent(false);
  localStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  document.documentElement.dataset.theme = 'light';
  resetStore();
});
afterEach(() => vi.unstubAllGlobals());
function resetStore() {
  useStore.setState({
    ...createUISlice(useStore.setState, useStore.getState, useStore),
    ...createConsentSlice(useStore.setState, useStore.getState, useStore),
  });
}
function page() {
  return render(
    <>
      <main tabIndex={-1}>Page content</main>
      <ConsentBanner />
      <StorageSettingsButton />
    </>
  );
}
it('shows three actions with equally weighted accept and reject, without taking focus', () => {
  page();
  const panel = screen.getByRole('region', { name: 'Your storage preferences' });
  expect(within(panel).getByRole('button', { name: 'Accept all' }).className).toBe(
    within(panel).getByRole('button', { name: 'Reject all' }).className
  );
  expect(within(panel).getByRole('button', { name: 'Customize' })).toBeVisible();
  expect(within(panel).queryByRole('button', { name: 'Close' })).toBeNull();
  expect(document.body).toHaveFocus();
});
it('opens independent switches with plain language and required mechanisms', async () => {
  page();
  await userEvent.click(screen.getByRole('button', { name: 'Customize' }));
  const dialog = screen.getByRole('dialog', { name: 'Storage settings' });
  expect(within(dialog).getByRole('heading', { name: 'Storage settings' })).toHaveFocus();
  expect(within(dialog).getByRole('switch', { name: 'Remember theme' })).not.toBeChecked();
  expect(within(dialog).getByRole('switch', { name: 'Recent searches' })).not.toBeChecked();
  expect(dialog).toHaveTextContent('Navigation position');
  expect(dialog).not.toHaveTextContent(/orbita\.|SESSION/);
});
it('saves a mixed choice and reopens it from the footer', async () => {
  page();
  await userEvent.click(screen.getByRole('button', { name: 'Customize' }));
  await userEvent.click(screen.getByRole('switch', { name: 'Remember theme' }));
  await userEvent.click(screen.getByRole('button', { name: 'Save choices' }));
  expect(useStore.getState().storageConsent?.permissions).toEqual({
    theme: true,
    recentSearches: false,
  });
  expect(screen.queryByRole('region', { name: 'Your storage preferences' })).toBeNull();
  expect(screen.getByRole('main')).toHaveFocus();
  await userEvent.click(screen.getByRole('button', { name: 'Storage settings' }));
  expect(screen.getByRole('switch', { name: 'Remember theme' })).toBeChecked();
  expect(screen.getByRole('switch', { name: 'Recent searches' })).not.toBeChecked();
});
it('cancels a draft and returns focus without inventing an answer', async () => {
  page();
  const opener = screen.getByRole('button', { name: 'Customize' });
  await userEvent.click(opener);
  await userEvent.click(screen.getByRole('switch', { name: 'Recent searches' }));
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(useStore.getState().storageConsent).toBeNull();
  expect(opener).toHaveFocus();
  await userEvent.click(opener);
  expect(screen.getByRole('switch', { name: 'Recent searches' })).not.toBeChecked();
});
it('accepts and rejects without reopening the first panel', async () => {
  page();
  await userEvent.click(screen.getByRole('button', { name: 'Accept all' }));
  expect(useStore.getState().storageConsent?.permissions).toEqual({
    theme: true,
    recentSearches: true,
  });
  await userEvent.click(screen.getByRole('button', { name: 'Storage settings' }));
  await userEvent.click(screen.getByRole('switch', { name: 'Remember theme' }));
  await userEvent.click(screen.getByRole('switch', { name: 'Recent searches' }));
  await userEvent.click(screen.getByRole('button', { name: 'Save choices' }));
  expect(useStore.getState().storageConsent?.permissions).toEqual({
    theme: false,
    recentSearches: false,
  });
  expect(screen.getByRole('button', { name: 'Storage settings' })).toHaveFocus();
});
it('keeps an error visible and permits retry after storage recovers', async () => {
  page();
  const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  await userEvent.click(screen.getByRole('button', { name: 'Accept all' }));
  expect(screen.getByRole('alert')).toHaveTextContent("couldn't save");
  expect(useStore.getState().storageConsent).toBeNull();
  spy.mockRestore();
  await userEvent.click(screen.getByRole('button', { name: 'Save choices' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('replaces a stale draft after a choice from another tab and explains why', async () => {
  page();
  await userEvent.click(screen.getByRole('button', { name: 'Customize' }));
  await userEvent.click(screen.getByRole('switch', { name: 'Remember theme' }));
  act(() => {
    writeStorageConsent({ theme: false, recentSearches: true });
    useStore.getState().syncConsent();
  });
  expect(screen.getByRole('switch', { name: 'Remember theme' })).not.toBeChecked();
  expect(screen.getByRole('switch', { name: 'Recent searches' })).toBeChecked();
  expect(screen.getByRole('status')).toHaveTextContent('another tab');
  expect(screen.getByRole('heading', { name: 'Storage settings' })).toHaveFocus();
});
