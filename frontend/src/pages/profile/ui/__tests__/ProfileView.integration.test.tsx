import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import ProfileView from '@/pages/profile/ui/ProfileView';
import { toast } from '@/shared/lib/toast';
import { apiClient } from '@/shared/api/client/api';
import { useStore } from '@/store';
import type { MyProfileDto as MyProfile } from '@/shared/api/generated/models/myProfileDto.dto';

/**
 * ProfileView -> hooks -> userService -> the real ApiClient (axios + interceptors).
 * Only the network is faked, so request bodies, the error handling of the shared client and the
 * session handling are covered end to end.
 */

vi.mock('react-router', async () => (await import('@/test/routerMock')).routerMock());

vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

/** Shape captured from GET /api/users/me on the real backend. */
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

function renderView(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <ProfileView />
      </QueryClientProvider>
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  apiClient.setUnauthorizedHandler(undefined);
  useStore.setState({ user: PROFILE, isAuthenticated: true, isInitialized: true });
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, href: '/profile' },
  });
});

afterEach(() => {
  mock.restore();
});

describe('loading the profile', () => {
  it('shows an accessible loading state first', () => {
    mock.onGet('/users/me').reply(() => new Promise(() => {}));
    renderView();

    expect(screen.getByRole('status', { name: 'Loading your profile' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
  });

  it('renders the profile fetched from the server, not placeholder data', async () => {
    mock.onGet('/users/me').reply(200, { ...PROFILE, displayName: 'Server Name' });
    renderView();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Server Name' })
    ).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('2 Posts')).toBeInTheDocument();
    expect(screen.getByText('5 Comments')).toBeInTheDocument();
    expect(screen.getByText('Joined October 2026')).toBeInTheDocument();
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    // Editing lives on the settings page, not here.
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit profile' })).toHaveAttribute(
      'href',
      '/settings/profile'
    );
    expect(mock.history.get).toHaveLength(1);
  });

  it('falls back to the username when there is no display name', async () => {
    mock.onGet('/users/me').reply(200, { ...PROFILE, displayName: null });
    renderView();

    expect(await screen.findByRole('heading', { level: 1, name: 'alice' })).toBeInTheDocument();
  });

  it('shows the avatar and falls back to the initial when the image cannot load', async () => {
    mock.onGet('/users/me').reply(200, { ...PROFILE, avatarUrl: 'https://example.com/a.png' });
    renderView();

    const avatar = await screen.findByRole('img', { name: 'Avatar of Alice' });
    expect(avatar).toHaveAttribute('src', 'https://example.com/a.png');
    expect(avatar).toHaveAttribute('referrerpolicy', 'no-referrer');

    fireEvent.error(avatar);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('shows only a fixed message for a server error, never its text or a toast, and can retry', async () => {
    mock
      .onGet('/users/me')
      .replyOnce(500, { status: 500, detail: 'PSQLException: relation "users" does not exist' });
    renderView();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load your profile. Please try again.');
    expect(document.body).not.toHaveTextContent('PSQLException');
    expect(toast.error).not.toHaveBeenCalled();

    mock.onGet('/users/me').reply(200, PROFILE);
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Alice' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the same message for a network error without a toast', async () => {
    mock.onGet('/users/me').networkError();
    renderView();

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load your profile');
    expect(document.body).not.toHaveTextContent('Network Error');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not perform a hard navigation or refresh after expired authentication', async () => {
    mock.onGet('/users/me').reply(401, { status: 401, detail: 'Authentication failed' });
    renderView();

    await waitFor(() =>
      expect(mock.history.get.some((request) => request.url === '/users/me')).toBe(true)
    );
    expect(window.location.href).toBe('/profile');
    expect(document.body).not.toHaveTextContent('Authentication failed');
    expect(document.body).not.toHaveTextContent('Invalid refresh token');
    // The redirect is a full-page navigation; until the browser leaves, only the fixed message shows.
    expect(document.body).not.toHaveTextContent(/401|Unauthorized/);
  });
});
