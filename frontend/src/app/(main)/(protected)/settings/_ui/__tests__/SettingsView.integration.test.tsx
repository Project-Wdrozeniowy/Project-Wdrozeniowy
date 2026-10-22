import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import SettingsView from '../SettingsView';
import { toast } from '@/shared/lib/toast';
import { apiClient } from '@/shared/api/client/api';
import { tokenMemory } from '@/shared/auth/tokenMemory';
import { useStore } from '@/store';
import type { MyProfile } from '@/shared/api/user/user.dto';

/**
 * SettingsView -> both forms -> hooks -> userService -> the real ApiClient (axios + interceptors).
 * Only the network is faked, so the request bodies, the error handling of the shared client and
 * the end of the session are covered end to end.
 */

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}));

vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const PROFILE: MyProfile = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: null,
  bio: 'Hello there',
  role: 'USER',
  status: 'ACTIVE',
  postCount: 2,
  commentCount: 5,
  createdAt: '2026-10-01T10:00:00.000Z',
};

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SettingsView />
    </QueryClientProvider>
  );
}

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

async function fillPasswords(current = 'old-password', next = 'new-password-1', repeat = next) {
  const user = userEvent.setup();
  await user.type(field('Current password'), current);
  await user.type(field('New password'), next);
  await user.type(field('Repeat new password'), repeat);
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  mock = new MockAdapter(axiosInstance);
  tokenMemory.set('access-token');
  useStore.setState({ user: PROFILE, isAuthenticated: true, isInitialized: true });
});

afterEach(() => {
  mock.restore();
  tokenMemory.set(null);
});

describe('loading', () => {
  it('shows an accessible loading state, then both forms', async () => {
    mock.onGet('/users/me').reply(200, PROFILE);
    renderView();
    expect(screen.getByRole('status', { name: 'Loading your settings' })).toBeInTheDocument();

    expect(await screen.findByRole('form', { name: 'Account settings' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Change password' })).toBeInTheDocument();
  });

  it('shows a fixed message and a retry when the profile cannot be loaded', async () => {
    mock.onGet('/users/me').replyOnce(500, { detail: 'stack trace at db:5432' });
    renderView();

    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent('db:5432');
    mock.onGet('/users/me').reply(200, PROFILE);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('form', { name: 'Account settings' })).toBeInTheDocument();
  });
});

describe('account settings', () => {
  it('saves only the changed field through PATCH /users/me and offers a link, not an upload', async () => {
    mock.onGet('/users/me').reply(200, PROFILE);
    mock
      .onPatch('/users/me')
      .reply(200, { ...PROFILE, avatarUrl: 'https://img.example.com/a.png' });
    renderView();
    await screen.findByRole('form', { name: 'Account settings' });

    const avatar = field('Avatar link');
    expect(avatar).toHaveAttribute('type', 'url');
    expect(document.querySelector('input[type="file"]')).toBeNull();

    const user = userEvent.setup();
    await user.type(avatar, 'https://img.example.com/a.png');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({
      avatarUrl: 'https://img.example.com/a.png',
    });
    expect(toast.success).toHaveBeenCalledWith('Profile saved.');
    expect(useStore.getState().user?.avatarUrl).toBe('https://img.example.com/a.png');
  });

  it('refuses a link that is not http(s) before any request', async () => {
    mock.onGet('/users/me').reply(200, PROFILE);
    renderView();
    await screen.findByRole('form', { name: 'Account settings' });

    const user = userEvent.setup();
    await user.type(field('Avatar link'), 'ftp://files.example.com/a.png');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText(/full link starting with http/)).toBeInTheDocument();
    expect(mock.history.patch).toHaveLength(0);
  });
});

describe('password change', () => {
  it('asks for confirmation first and sends nothing until it is given', async () => {
    mock.onGet('/users/me').reply(200, PROFILE);
    renderView();
    await screen.findByRole('form', { name: 'Change password' });

    const user = await fillPasswords();
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('signs you out on all devices');
    expect(mock.history.post).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
    expect(useStore.getState().isAuthenticated).toBe(true);
  });

  it('cancels with Escape', async () => {
    mock.onGet('/users/me').reply(200, PROFILE);
    renderView();
    await screen.findByRole('form', { name: 'Change password' });
    const user = await fillPasswords();
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    await screen.findByRole('alertdialog');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('changes the password through POST /users/me/password and ends the session', async () => {
    mock.onGet('/users/me').reply(200, PROFILE);
    mock.onPost('/users/me/password').reply(204);
    renderView();
    await screen.findByRole('form', { name: 'Change password' });

    const user = await fillPasswords('old-password', 'new-password-1');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    await user.click(await screen.findByRole('button', { name: 'Change password and sign out' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(mock.history.post).toHaveLength(1);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      currentPassword: 'old-password',
      newPassword: 'new-password-1',
    });
    expect(toast.success).toHaveBeenCalledWith('Password changed. Please sign in again.');
    expect(useStore.getState().isAuthenticated).toBe(false);
    expect(tokenMemory.get()).toBeNull();
  });

  it('does not let Cancel call off a change that is already sent', async () => {
    mock.onGet('/users/me').reply(200, PROFILE);
    mock.onPost('/users/me/password').reply(() => new Promise(() => {}));
    renderView();
    await screen.findByRole('form', { name: 'Change password' });

    const user = await fillPasswords();
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    await user.click(await screen.findByRole('button', { name: 'Change password and sign out' }));
    await screen.findByRole('button', { name: 'Changing…' });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(mock.history.post.filter((r) => r.url === '/users/me/password')).toHaveLength(1);
  });

  it('keeps the session and marks the field when the current password is wrong', async () => {
    mock.onGet('/users/me').reply(200, PROFILE);
    mock
      .onPost('/users/me/password')
      .reply(400, { status: 400, detail: 'Current password is incorrect' });
    renderView();
    await screen.findByRole('form', { name: 'Change password' });

    const user = await fillPasswords('wrong-password');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    await user.click(await screen.findByRole('button', { name: 'Change password and sign out' }));

    expect(await screen.findByText('Your current password is incorrect')).toBeInTheDocument();
    expect(field('Current password')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Current password')).toHaveFocus();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(useStore.getState().isAuthenticated).toBe(true);
    expect(tokenMemory.get()).toBe('access-token');
  });

  it('shows a fixed message on a server failure and keeps the session', async () => {
    mock.onGet('/users/me').reply(200, PROFILE);
    mock.onPost('/users/me/password').reply(500, { detail: 'SQL exploded at 10.0.0.5' });
    renderView();
    await screen.findByRole('form', { name: 'Change password' });

    const user = await fillPasswords();
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    await user.click(await screen.findByRole('button', { name: 'Change password and sign out' }));

    const alert = await screen.findByText('We could not change your password. Please try again.');
    expect(alert).toBeInTheDocument();
    expect(screen.queryByText(/SQL/)).not.toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
    expect(useStore.getState().isAuthenticated).toBe(true);
  });

  it('validates before asking for confirmation', async () => {
    mock.onGet('/users/me').reply(200, PROFILE);
    renderView();
    await screen.findByRole('form', { name: 'Change password' });

    const user = await fillPasswords('old-password', 'short', 'short');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(
      await screen.findByText(/at least 8 characters/, { selector: '[role="alert"]' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it('refuses a repeated password that does not match', async () => {
    mock.onGet('/users/me').reply(200, PROFILE);
    renderView();
    await screen.findByRole('form', { name: 'Change password' });

    const user = await fillPasswords('old-password', 'new-password-1', 'new-password-2');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });
});
