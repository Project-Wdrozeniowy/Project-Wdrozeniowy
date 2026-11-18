import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsentBanner from '@/widgets/consent-banner/ConsentBanner';
import StorageSettingsButton from '@/widgets/consent-banner/StorageSettingsButton';
import { createConsentSlice } from '@/store/slices/consentSlice';
import { useStore } from '@/store';

function resetStore() {
  const fresh = createConsentSlice(useStore.setState, useStore.getState, useStore);
  useStore.setState({
    storageConsent: fresh.storageConsent,
    consentPromptOpen: fresh.consentPromptOpen,
  });
}

function renderPage() {
  return render(
    <>
      <ConsentBanner />
      <StorageSettingsButton />
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.setAttribute('data-theme', 'light');
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  resetStore();
});

afterEach(() => vi.unstubAllGlobals());

describe('the first question', () => {
  it('is shown before any answer, with accept and reject looking the same', () => {
    renderPage();

    const banner = screen.getByRole('region', { name: 'Your storage preferences' });
    const accept = within(banner).getByRole('button', { name: 'Accept optional storage' });
    const reject = within(banner).getByRole('button', { name: 'Reject optional storage' });
    expect(accept.className).toBe(reject.className);
    expect(within(banner).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('does not take the focus away from the page', () => {
    renderPage();

    expect(document.body).toHaveFocus();
  });

  it('stores nothing until the user answers', () => {
    renderPage();

    expect(localStorage.length).toBe(0);
  });

  it('lists everything that is stored, and which parts are optional', async () => {
    renderPage();

    await userEvent.click(screen.getByText('What is stored'));

    expect(screen.getByText(/Session cookie \(SESSION\)/)).toBeVisible();
    expect(screen.getByText(/Theme \(orbita\.theme\)/)).toBeVisible();
    expect(screen.getByText(/Recent searches \(orbita\.recentSearches\)/)).toBeVisible();
    expect(screen.getAllByText(/— optional\./)).toHaveLength(2);
    expect(screen.getAllByText(/— needed\./)).toHaveLength(2);
  });
});

describe('answering', () => {
  it('accepting remembers the answer and hides the question', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Accept optional storage' }));

    expect(localStorage.getItem('orbita.consent')).toBe('granted');
    expect(screen.queryByRole('region', { name: 'Your storage preferences' })).toBeNull();
  });

  it('rejecting remembers the answer and stores nothing optional', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Reject optional storage' }));

    expect(localStorage.getItem('orbita.consent')).toBe('denied');
    expect(localStorage.getItem('orbita.theme')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Your storage preferences' })).toBeNull();
  });

  it('does not ask again once answered', () => {
    localStorage.setItem('orbita.consent', 'denied');
    resetStore();

    renderPage();

    expect(screen.queryByRole('region', { name: 'Your storage preferences' })).toBeNull();
  });
});

describe('changing the answer later', () => {
  beforeEach(() => {
    localStorage.setItem('orbita.consent', 'granted');
    localStorage.setItem('orbita.theme', 'dark');
    localStorage.setItem('orbita.recentSearches', '["react"]');
    resetStore();
  });

  it('is possible from the storage settings button, which moves the focus to the question', async () => {
    renderPage();
    const opener = screen.getByRole('button', { name: 'Storage settings' });
    expect(opener).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(opener);

    const banner = screen.getByRole('region', { name: 'Your storage preferences' });
    expect(banner).toHaveTextContent('You accepted optional storage');
    expect(screen.getByRole('heading', { name: 'Your storage preferences' })).toHaveFocus();
    expect(opener).toHaveAttribute('aria-expanded', 'true');
    expect(within(banner).getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('withdrawing deletes what was stored and returns the focus to the opener', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Storage settings' }));

    await userEvent.click(screen.getByRole('button', { name: 'Reject optional storage' }));

    expect(localStorage.getItem('orbita.consent')).toBe('denied');
    expect(localStorage.getItem('orbita.theme')).toBeNull();
    expect(localStorage.getItem('orbita.recentSearches')).toBeNull();
    expect(screen.getByRole('button', { name: 'Storage settings' })).toHaveFocus();
  });

  it('closing keeps the answer and returns the focus to the opener', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Storage settings' }));

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(localStorage.getItem('orbita.consent')).toBe('granted');
    expect(localStorage.getItem('orbita.theme')).toBe('dark');
    expect(screen.queryByRole('region', { name: 'Your storage preferences' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Storage settings' })).toHaveFocus();
  });
});

describe('another tab', () => {
  it('answering there closes the question here', () => {
    renderPage();
    expect(screen.getByRole('region', { name: 'Your storage preferences' })).toBeInTheDocument();

    localStorage.setItem('orbita.consent', 'granted');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'orbita.consent' }));
    });

    expect(screen.queryByRole('region', { name: 'Your storage preferences' })).toBeNull();
  });

  it('ignores changes of other keys', () => {
    renderPage();

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'orbita.theme' }));
    });

    expect(screen.getByRole('region', { name: 'Your storage preferences' })).toBeInTheDocument();
  });
});
