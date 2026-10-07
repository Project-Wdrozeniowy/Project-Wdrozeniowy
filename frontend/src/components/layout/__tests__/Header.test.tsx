import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Header from '../Header';
import { authService } from '@/services/authService';
import { toast } from '@/lib/toast';
import { useStore } from '@/store';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/services/authService', () => ({
  authService: { logout: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { success: vi.fn(), error: vi.fn() },
}));

const logout = vi.fn();

vi.mock('@/store', () => ({
  useStore: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  const state = {
    isAuthenticated: true,
    user: { id: 1, username: 'alice', displayName: 'Alice', role: 'USER' },
    logout,
  };
  vi.mocked(useStore).mockImplementation(((selector: (s: unknown) => unknown) =>
    selector(state)) as typeof useStore);
});

describe('Header sign out', () => {
  it('clears the session after the server revoked the refresh token', async () => {
    vi.mocked(authService.logout).mockResolvedValue(undefined);
    render(<Header />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('You have been signed out.');
  });

  it('keeps the session when the logout request fails', async () => {
    // The refresh cookie is still valid, so clearing only the client state would
    // sign the user back in on the next page load.
    vi.mocked(authService.logout).mockRejectedValue(new Error('offline'));
    render(<Header />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Could not sign out. Please try again.', 'api-error')
    );
    expect(logout).not.toHaveBeenCalled();
  });
});
