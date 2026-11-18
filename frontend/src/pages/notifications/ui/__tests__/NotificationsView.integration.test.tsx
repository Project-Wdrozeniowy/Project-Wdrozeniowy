import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import NotificationsView from '../NotificationsView';
import { apiClient } from '@/shared/api/client/api';
import { toast } from '@/shared/lib/toast';
import { useStore } from '@/store';
import { fakeNotificationServer, makeNotification } from '@/test/fakeNotificationServer';

/**
 * NotificationsView -> hooks -> generated operations -> the real ApiClient (axios, CSRF,
 * interceptors). Only the network is faked, by a stateful stand-in for the API, so each test
 * shows what the user sees after the server has answered, as the contract documents it.
 */

let search = '';

vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({
    useSearchParams: () => [new URLSearchParams(search), vi.fn()],
  })
);
vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NotificationsView />
    </QueryClientProvider>
  );
}

const listRequests = () => mock.history.get.filter((request) => request.url === '/notifications');

beforeEach(() => {
  vi.clearAllMocks();
  search = '';
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  useStore.setState({
    user: { id: 1, username: 'alice' } as never,
    isAuthenticated: true,
    isInitialized: true,
  });
});

afterEach(() => mock.restore());

describe('loading and showing the notifications', () => {
  it('shows an accessible loading state first', async () => {
    mock.onGet('/notifications').reply(() => new Promise(() => {}));
    renderView();
    expect(screen.getByRole('status', { name: 'Loading notifications' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
  });

  it('lists the notifications with the unread ones marked, and the unread count of the server', async () => {
    fakeNotificationServer(mock, [
      makeNotification({ id: 1, message: 'Unread one' }),
      makeNotification({ id: 2, message: 'Read one', read: true }),
    ]);
    renderView();

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Unread')).toBeInTheDocument();
    expect(items[0]).toHaveAttribute('data-unread', 'true');
    expect(within(items[1]).queryByText('Unread')).not.toBeInTheDocument();
    expect(items[1]).toHaveAttribute('data-unread', 'false');
    expect(await screen.findByText('1 unread')).toBeInTheDocument();

    const countRequest = listRequests().find((request) => request.params?.unreadOnly === true);
    expect(countRequest?.params).toEqual({ unreadOnly: true, size: 1, page: 0 });
  });

  it('asks only for unread notifications under ?filter=unread', async () => {
    search = 'filter=unread';
    fakeNotificationServer(mock, [
      makeNotification({ id: 1, message: 'Unread one' }),
      makeNotification({ id: 2, message: 'Read one', read: true }),
    ]);
    renderView();

    expect(await screen.findByText('Unread one')).toBeInTheDocument();
    expect(screen.queryByText('Read one')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Unread' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'All' })).not.toHaveAttribute('aria-current');
  });

  it('says so when there is nothing, in words for each filter', async () => {
    fakeNotificationServer(mock, []);
    const { unmount } = renderView();
    expect(await screen.findByText('You have no notifications yet.')).toBeInTheDocument();
    unmount();

    search = 'filter=unread';
    renderView();
    expect(await screen.findByText('You have no unread notifications.')).toBeInTheDocument();
  });

  it('sends nothing to the API for a guest: the notifications are private', async () => {
    useStore.setState({ user: null, isAuthenticated: false });
    fakeNotificationServer(mock, [makeNotification()]);
    renderView();

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(listRequests()).toHaveLength(0);
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('loads more pages and never shows an item twice', async () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      makeNotification({ id: 100 - i, message: `Item ${100 - i}`, read: true })
    );
    fakeNotificationServer(mock, many);
    renderView();

    expect(await screen.findAllByRole('listitem')).toHaveLength(20);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(25));
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    const pageRequests = listRequests().filter((request) => request.params?.size === 20);
    expect(pageRequests.map((request) => request.params.page)).toEqual([0, 1]);
  });
});

describe('where a notification leads', () => {
  it('links an open discussion to its post, and explains one that is gone', async () => {
    fakeNotificationServer(mock, [
      makeNotification({ id: 1, message: 'Open one', read: true }),
      makeNotification({
        id: 2,
        message: 'Gone one',
        read: true,
        destination: {
          available: false,
          postSlug: null,
          commentId: null,
          unavailableReason: 'COMMENT_UNAVAILABLE',
        },
      }),
      makeNotification({
        id: 3,
        message: 'A vote',
        type: 'VOTE_ON_POST',
        entityType: 'POST',
        read: true,
        destination: null,
      }),
    ]);
    renderView();

    const [open, gone, vote] = await screen.findAllByRole('listitem');
    expect(within(open).getByRole('link', { name: 'Open discussion' })).toHaveAttribute(
      'href',
      '/forum/post-1'
    );
    expect(within(gone).getByText('This discussion is no longer available')).toBeInTheDocument();
    expect(within(gone).queryByRole('link')).not.toBeInTheDocument();
    expect(within(vote).queryByRole('link')).not.toBeInTheDocument();
  });

  it('marks an unread notification as read when its link is followed', async () => {
    const server = fakeNotificationServer(mock, [
      makeNotification({ id: 1, message: 'Unread one' }),
    ]);
    renderView();

    await userEvent.setup().click(await screen.findByRole('link', { name: 'Open discussion' }));

    await waitFor(() => expect(server.items()[0].read).toBe(true));
  });
});

describe('following a notification while another change is pending', () => {
  it('still marks the followed notification as read', async () => {
    let release: () => void = () => {};
    mock.onPatch('/notifications/1/read').reply(
      () =>
        new Promise((resolve) => {
          release = () => resolve([200, makeNotification({ id: 1, read: true })]);
        })
    );
    const server = fakeNotificationServer(mock, [
      makeNotification({ id: 1, message: 'First' }),
      makeNotification({ id: 2, message: 'Second' }),
    ]);
    renderView();
    const user = userEvent.setup();
    const [first, second] = await screen.findAllByRole('listitem');

    await user.click(within(first).getByRole('button', { name: 'Mark as read' }));
    await user.click(within(second).getByRole('link', { name: 'Open discussion' }));
    release();

    await waitFor(() => expect(server.items().map((item) => item.read)).toEqual([false, true]));
  });
});

describe('changing notifications', () => {
  it('marks one as read and shows what the server then returns, including the count', async () => {
    const server = fakeNotificationServer(mock, [
      makeNotification({ id: 1, message: 'First' }),
      makeNotification({ id: 2, message: 'Second' }),
    ]);
    renderView();
    expect(await screen.findByText('2 unread')).toBeInTheDocument();

    const first = (await screen.findAllByRole('listitem'))[0];
    await userEvent.setup().click(within(first).getByRole('button', { name: 'Mark as read' }));

    expect(await screen.findByText('1 unread')).toBeInTheDocument();
    expect(server.items().map((item) => item.read)).toEqual([true, false]);
    expect(mock.history.patch.map((request) => request.url)).toEqual(['/notifications/1/read']);
    const [updated] = screen.getAllByRole('listitem');
    expect(within(updated).queryByRole('button', { name: 'Mark as read' })).not.toBeInTheDocument();
    expect(mock.history.patch[0].headers?.['X-CSRF-TOKEN']).toBe('csrf');
  });

  it('marks every notification as read', async () => {
    const server = fakeNotificationServer(mock, [
      makeNotification({ id: 1 }),
      makeNotification({ id: 2 }),
    ]);
    renderView();
    await screen.findByText('2 unread');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Mark all as read' }));

    expect(await screen.findByText('All caught up')).toBeInTheDocument();
    expect(server.items().every((item) => item.read)).toBe(true);
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('does not send "mark all" when the server counts nothing unread', async () => {
    fakeNotificationServer(mock, [makeNotification({ id: 1, read: true })]);
    renderView();
    await screen.findByText('All caught up');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(mock.history.patch).toHaveLength(0);
  });

  it('deletes one, removes it from the list and returns the focus to the list', async () => {
    const server = fakeNotificationServer(mock, [
      makeNotification({ id: 1, message: 'Keep me' }),
      makeNotification({ id: 2, message: 'Delete me' }),
    ]);
    renderView();
    const target = (await screen.findAllByRole('listitem'))[1];

    await userEvent.setup().click(within(target).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByText('Delete me')).not.toBeInTheDocument());
    expect(screen.getByText('Keep me')).toBeInTheDocument();
    expect(server.items().map((item) => item.id)).toEqual([1]);
    expect(await screen.findByText('1 unread')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Notifications' })).toHaveFocus();
  });

  it('ignores a second click while a change is being sent', async () => {
    // The specific handler goes first: the first matching handler answers.
    let release: () => void = () => {};
    mock.onPatch('/notifications/1/read').reply(
      () =>
        new Promise((resolve) => {
          release = () => resolve([200, makeNotification({ id: 1, read: true })]);
        })
    );
    fakeNotificationServer(mock, [makeNotification({ id: 1 })]);
    renderView();
    const user = userEvent.setup();
    const button = await screen.findByRole('button', { name: 'Mark as read' });

    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-disabled', 'true'));
    await user.click(button);
    release();

    await waitFor(() => expect(button).toHaveAttribute('aria-disabled', 'false'));
    expect(mock.history.patch).toHaveLength(1);
  });

  it('refreshes the list and says so when the notification is already gone (404)', async () => {
    const server = fakeNotificationServer(mock, [
      makeNotification({ id: 1, message: 'Gone elsewhere' }),
      makeNotification({ id: 2, message: 'Still here' }),
    ]);
    renderView();
    const target = (await screen.findAllByRole('listitem'))[0];
    server.removeBehindTheScenes(1);

    await userEvent.setup().click(within(target).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByText('Gone elsewhere')).not.toBeInTheDocument());
    expect(toast.error).toHaveBeenCalledWith(
      'That notification no longer exists. The list was refreshed.',
      'notification-action'
    );
    expect(screen.getByText('Still here')).toBeInTheDocument();
  });

  it('keeps the list, tells the user in our words and hides server details when a change fails', async () => {
    mock.onPatch('/notifications/1/read').reply(500, { detail: 'SQL exploded at 10.0.0.5' });
    fakeNotificationServer(mock, [makeNotification({ id: 1, message: 'Stays unread' })]);
    renderView();

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Mark as read' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'We could not mark the notification as read. Try again.',
        'notification-action'
      )
    );
    expect(JSON.stringify(vi.mocked(toast.error).mock.calls)).not.toContain('SQL');
    expect(screen.getByText('Stays unread')).toBeInTheDocument();
    expect(screen.getByText('1 unread')).toBeInTheDocument();
  });
});

describe('failures of loading', () => {
  it('shows a fixed message and a retry, and no server text', async () => {
    mock.onGet('/notifications').replyOnce(500, { detail: 'stack trace at db:5432' });
    mock.onGet('/notifications').replyOnce(500, { detail: 'stack trace at db:5432' });
    renderView();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load your notifications');
    expect(alert).not.toHaveTextContent('db:5432');

    fakeNotificationServer(mock, [makeNotification({ id: 1, message: 'Back again' })]);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Back again')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps what is on screen and warns when a refresh fails', async () => {
    const server = fakeNotificationServer(mock, [makeNotification({ id: 1, message: 'Shown' })]);
    renderView();
    const user = userEvent.setup();
    await screen.findByText('Shown');
    expect(server.items()).toHaveLength(1);

    // The mark-read goes through, then the reload that follows it fails.
    mock.onGet('/notifications').reply(500);
    await user.click(screen.getByRole('button', { name: 'Mark as read' }));

    expect(
      await screen.findByText('We could not refresh the list. What you see may be out of date.')
    ).toBeInTheDocument();
    expect(screen.getByText('Shown')).toBeInTheDocument();
  });

  it('warns about a failed refresh even when the list it leaves is empty', async () => {
    search = 'filter=unread';
    fakeNotificationServer(mock, [makeNotification({ id: 1, message: 'Last unread' })]);
    renderView();
    const user = userEvent.setup();
    await screen.findByText('Last unread');

    mock.onGet('/notifications').reply(500);
    await user.click(screen.getByRole('button', { name: 'Mark as read' }));

    expect(
      await screen.findByText('We could not refresh the list. What you see may be out of date.')
    ).toBeInTheDocument();
  });

  it('says so when "Load more" fails, and lets the user try again', async () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      makeNotification({ id: 100 - i, message: `Item ${100 - i}`, read: true })
    );
    const server = fakeNotificationServer(mock, many);
    renderView();
    const user = userEvent.setup();
    await screen.findAllByRole('listitem');
    expect(server.items()).toHaveLength(25);

    mock.onGet('/notifications').reply(500, { detail: 'SQL exploded' });
    await user.click(screen.getByRole('button', { name: 'Load more' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load more notifications. Try again.');
    expect(alert).not.toHaveTextContent('SQL');
    expect(screen.getAllByRole('listitem')).toHaveLength(20);

    fakeNotificationServer(mock, many);
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(25));
  });
});
