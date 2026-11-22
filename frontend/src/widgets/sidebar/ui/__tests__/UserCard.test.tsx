import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import { apiClient } from '@/shared/api/client/api';
import type { UserProfileDto } from '@/shared/api/generated/models/userProfileDto.dto';
import { useStore } from '@/store';
import UserCard from '@/widgets/sidebar/ui/UserCard';

vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

const USER: UserProfileDto = {
  id: 1,
  username: 'alice',
  displayName: 'Alice A.',
  avatarUrl: null,
  bio: null,
  role: 'USER',
  status: 'ACTIVE',
  postCount: 1234,
  commentCount: 5,
  createdAt: '2026-10-01T10:00:00Z',
};

function notifications(unread: number) {
  mock.onGet('/notifications').reply(200, {
    content: [],
    page: 0,
    size: 1,
    totalElements: unread,
    totalPages: unread,
    first: true,
    last: true,
  });
}

function renderCard(pathname = '/', user: UserProfileDto = USER) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UserCard user={user} initials="AA" pathname={pathname} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  useStore.setState({ isAuthenticated: true, isInitialized: true });
});

afterEach(() => mock.restore());

describe('UserCard', () => {
  it('shows who is signed in, linking to the profile', () => {
    notifications(0);
    renderCard();

    expect(screen.getByRole('link', { name: /Alice A\./ })).toHaveAttribute('href', '/profile');
    expect(screen.getByText('@alice')).toBeInTheDocument();
  });

  it('links only pages the app has: profile, notifications and settings', () => {
    notifications(0);
    renderCard();

    const nav = screen.getByRole('navigation', { name: 'Your account' });
    expect(within(nav).getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
    expect(within(nav).getByRole('link', { name: /Notifications/ })).toHaveAttribute(
      'href',
      '/notifications'
    );
    expect(within(nav).getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings'
    );
    expect(within(nav).getAllByRole('link')).toHaveLength(3);
  });

  it('shows the counts the platform has for this user, and nothing invented', () => {
    notifications(0);
    renderCard();

    expect(screen.getByText('1,234').closest('div')).toHaveTextContent('Posts');
    expect(screen.getByText('5').closest('div')).toHaveTextContent('Comments');
    expect(document.body).not.toHaveTextContent(/Followers|Following|—/);
  });

  it('shows the number of unread notifications the API counts, for screen readers too', async () => {
    notifications(3);
    renderCard();

    const link = await screen.findByRole('link', { name: /Notifications.*3 unread/ });
    expect(within(link).getByText('3', { selector: '[aria-hidden="true"]' })).toBeInTheDocument();
  });

  it('caps a large unread count and shows nothing for none', async () => {
    notifications(250);
    const { unmount } = renderCard();
    expect(await screen.findByText('99+')).toBeInTheDocument();
    unmount();

    mock.reset();
    notifications(0);
    renderCard();
    await screen.findByRole('link', { name: 'Notifications' });
    expect(screen.queryByText(/unread/)).not.toBeInTheDocument();
  });

  it('marks the current page, also for a section of it', () => {
    notifications(0);
    renderCard('/settings/account');

    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Profile' })).not.toHaveAttribute('aria-current');
  });

  it('leaves out a count the profile does not carry, instead of breaking the card', () => {
    notifications(0);
    renderCard('/', { ...USER, commentCount: undefined } as unknown as UserProfileDto);

    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.queryByText('Comments')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
  });

  it('shows an icon with each entry, hidden from assistive technology', () => {
    notifications(0);
    renderCard();

    const nav = screen.getByRole('navigation', { name: 'Your account' });
    for (const link of within(nav).getAllByRole('link')) {
      expect(link.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('offers no entry for a feature the app does not have', () => {
    notifications(0);
    renderCard();

    for (const name of ['Messages', 'Saved Posts', 'Your Stats', 'Achievements']) {
      expect(screen.queryByText(name)).not.toBeInTheDocument();
    }
  });
});
