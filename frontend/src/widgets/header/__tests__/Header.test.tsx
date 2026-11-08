import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Header from '../Header';
import { signOutSession } from '@/shared/auth/session';
import { toast } from '@/shared/lib/toast';
import { useStore } from '@/store';

vi.mock('@/shared/auth/session', () => ({ signOutSession: vi.fn() }));
vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('../ui/SearchBar', () => ({ default: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState({
    isAuthenticated: true,
    user: { id: 1, username: 'alice', displayName: 'Alice', role: 'USER' } as NonNullable<
      ReturnType<typeof useStore.getState>['user']
    >,
  });
});

it('reports sign-out success only after the shared lifecycle succeeds', async () => {
  vi.mocked(signOutSession).mockResolvedValue(undefined);
  render(<Header />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('You have been signed out.'));
  expect(signOutSession).toHaveBeenCalledTimes(1);
});

it('reports a recoverable sign-out failure without announcing success', async () => {
  vi.mocked(signOutSession).mockRejectedValue(new Error('offline'));
  render(<Header />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith('Could not sign out. Please try again.', 'api-error')
  );
  expect(toast.success).not.toHaveBeenCalled();
});
