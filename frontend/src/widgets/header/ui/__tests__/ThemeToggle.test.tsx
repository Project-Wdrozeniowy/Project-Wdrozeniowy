import { seedStorageConsent } from '@/test/storageConsent';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from '@/widgets/header/ui/ThemeToggle';
import { useStore } from '@/store';

beforeEach(() => {
  localStorage.clear();
  seedStorageConsent();
  document.documentElement.setAttribute('data-theme', 'light');
  useStore.setState({ theme: 'light' });
});

describe('ThemeToggle', () => {
  it('offers the dark theme while the page is light', () => {
    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
  });

  it('offers the light theme while the page is dark', () => {
    useStore.setState({ theme: 'dark' });

    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  });

  it('switches the page and remembers the choice', async () => {
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('orbita.theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('orbita.theme')).toBe('light');
  });

  it('still switches the page, but remembers nothing, without the permission to store', async () => {
    localStorage.removeItem('orbita.consent');
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('orbita.theme')).toBeNull();
  });
});
