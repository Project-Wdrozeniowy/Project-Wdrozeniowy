import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import NotificationBell from '../NotificationBell';
import { apiClient } from '@/shared/api/client/api';
import { useStore } from '@/store';
import { fakeNotificationServer, makeNotification } from '@/test/fakeNotificationServer';

let pathname = '/';

vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({
    useLocation: () => ({ pathname, search: '', hash: '', state: null, key: 'test' }),
  })
);

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

function renderBell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NotificationBell />
    </QueryClientProvider>
  );
}

const unread = (count: number) =>
  Array.from({ length: count }, (_, i) => makeNotification({ id: i + 1 }));

beforeEach(() => {
  pathname = '/';
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  useStore.setState({
    isAuthenticated: true,
    isInitialized: true,
  });
});

afterEach(() => mock.restore());

describe('NotificationBell', () => {
  it('links to the notification page and shows the number the server counts as unread', async () => {
    fakeNotificationServer(mock, unread(3));
    renderBell();

    const link = await screen.findByRole('link', { name: 'Notifications, 3 unread' });
    expect(link).toHaveAttribute('href', '/notifications');
    expect(link).toHaveTextContent('3');
    expect(mock.history.get[0].params).toEqual({ unreadOnly: true, size: 1, page: 0 });
  });

  it('shows 99+ for a larger number', async () => {
    fakeNotificationServer(mock, unread(120));
    renderBell();

    const link = await screen.findByRole('link', { name: 'Notifications, 120 unread' });
    expect(link).toHaveTextContent('99+');
  });

  it('shows no number when nothing is unread', async () => {
    fakeNotificationServer(mock, [makeNotification({ id: 1, read: true })]);
    renderBell();

    await waitFor(() => expect(mock.history.get).toHaveLength(1));
    const link = screen.getByRole('link', { name: 'Notifications' });
    expect(link).not.toHaveTextContent(/\d/);
  });

  it('shows no number, and no error, when the count cannot be loaded', async () => {
    mock.onGet('/notifications').reply(500, { detail: 'SQL exploded' });
    renderBell();

    await waitFor(() => expect(mock.history.get).toHaveLength(1));
    const link = screen.getByRole('link', { name: 'Notifications' });
    expect(link).not.toHaveTextContent(/\d|SQL/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('asks nothing for a guest', async () => {
    useStore.setState({ isAuthenticated: false });
    fakeNotificationServer(mock, unread(2));
    renderBell();

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mock.history.get).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Notifications' })).not.toHaveTextContent(/\d/);
  });

  it('marks the page it leads to as the current one', async () => {
    pathname = '/notifications';
    fakeNotificationServer(mock, []);
    renderBell();

    expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });
});
