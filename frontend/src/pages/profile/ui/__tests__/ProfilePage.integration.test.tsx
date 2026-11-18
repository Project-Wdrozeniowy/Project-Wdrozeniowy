import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import ProfilePage from '@/pages/profile/ui/ProfilePage';
import { apiClient } from '@/shared/api/client/api';
import type { MyProfileDto } from '@/shared/api/generated/models/myProfileDto.dto';
import { toast } from '@/shared/lib/toast';
import { useStore } from '@/store';
import { makePost } from '@/test/fakeAnalyticsServer';

/**
 * ProfilePage -> hooks -> generated operations -> the real ApiClient (axios, CSRF, interceptors).
 * Only the network is faked, and answers as the API documents (`GET /forum/posts?author=`).
 */

vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({ useNavigate: () => vi.fn() })
);
vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

const PROFILE: MyProfileDto = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: null,
  bio: 'Hello there',
  role: 'USER',
  status: 'ACTIVE',
  postCount: 12,
  commentCount: 5,
  createdAt: '2026-10-01T10:00:00.000Z',
};

function pageOf(ids: number[], page: number, last: boolean) {
  return {
    content: ids.map((id) => makePost(id, `Post ${id}`)),
    page,
    size: 10,
    totalElements: 25,
    totalPages: 3,
    first: page === 0,
    last,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProfilePage />
    </QueryClientProvider>
  );
}

const postRequests = () => mock.history.get.filter((request) => request.url === '/forum/posts');

beforeEach(() => {
  vi.clearAllMocks();
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  mock.onGet('/users/me').reply(200, PROFILE);
  useStore.setState({ user: PROFILE as never, isAuthenticated: true, isInitialized: true });
});

afterEach(() => mock.restore());

describe('the posts of the profile', () => {
  it("lists the user's own published posts, newest first, asking the API for that author", async () => {
    mock.onGet('/forum/posts').reply(200, pageOf([30, 20, 10], 0, true));
    renderPage();

    const section = await screen.findByRole('region', { name: 'Posts' });
    expect(await within(section).findByRole('link', { name: 'Post 30' })).toBeInTheDocument();
    const cards = within(section).getAllByRole('article');
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual([
      'Post 30',
      'Post 20',
      'Post 10',
    ]);
    expect(postRequests()[0].params).toEqual({
      author: 'alice',
      page: 0,
      size: 10,
      sort: 'createdAt',
    });
  });

  it('shows a loading state until the posts are there', async () => {
    mock.onGet('/forum/posts').reply(() => new Promise(() => {}));
    renderPage();

    expect(await screen.findByRole('status', { name: 'Loading your posts' })).toBeInTheDocument();
  });

  it('asks for no posts until it knows whose they are', async () => {
    mock.onGet('/users/me').reply(() => new Promise(() => {}));
    renderPage();

    expect(screen.getByRole('status', { name: 'Loading your posts' })).toBeInTheDocument();
    expect(postRequests()).toHaveLength(0);
  });

  it('loads the next page on request, and stops offering it at the last page', async () => {
    mock
      .onGet('/forum/posts')
      .reply((config) =>
        config.params.page === 0 ? [200, pageOf([30, 20], 0, false)] : [200, pageOf([10], 1, true)]
      );
    renderPage();
    await screen.findByRole('link', { name: 'Post 30' });

    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await screen.findByRole('link', { name: 'Post 10' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(postRequests()[1].params.page).toBe(1);
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('says so when the user has published nothing', async () => {
    mock.onGet('/forum/posts').reply(200, { ...pageOf([], 0, true), totalElements: 0 });
    renderPage();

    expect(await screen.findByText('You have not published a post yet.')).toBeInTheDocument();
  });

  it('shows a fixed message and a retry for a failure, never the server text or a toast', async () => {
    mock.onGet('/forum/posts').replyOnce(500, { detail: 'PSQLException at db:5432' });
    mock.onGet('/forum/posts').reply(200, pageOf([7], 0, true));
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load your posts. Please try again.');
    expect(document.body).not.toHaveTextContent('PSQLException');
    expect(toast.error).not.toHaveBeenCalled();

    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'Post 7' })).toBeInTheDocument();
  });

  it('keeps the loaded posts and says so when the next page fails', async () => {
    mock
      .onGet('/forum/posts')
      .reply((config) =>
        config.params.page === 0 ? [200, pageOf([30, 20], 0, false)] : [500, { detail: 'boom' }]
      );
    renderPage();
    await screen.findByRole('link', { name: 'Post 30' });

    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load your posts');
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument();
  });

  it('shows the score the server answers with when a post of the list is voted on', async () => {
    mock.onGet('/forum/posts').reply(200, pageOf([30], 0, true));
    mock.onPost('/forum/votes').reply(201, {
      id: 9,
      entityType: 'POST',
      entityId: 30,
      voteType: 'UP',
      newScore: 8,
    });
    renderPage();
    await screen.findByRole('link', { name: 'Post 30' });

    await userEvent.click(screen.getByRole('button', { name: 'Upvote' }));

    expect(await screen.findByText('8')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Upvote' })).toHaveClass('text-accent')
    );
  });
});

describe('when the profile or the list misbehaves', () => {
  it('shows no endless loading for the posts when the profile itself failed to load', async () => {
    mock.onGet('/users/me').reply(500, { detail: 'stack trace' });
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load your profile');
    expect(screen.queryByRole('status', { name: 'Loading your posts' })).not.toBeInTheDocument();
    expect(postRequests()).toHaveLength(0);
  });

  it('shows a post once, even when the next page repeats it', async () => {
    mock
      .onGet('/forum/posts')
      .reply((config) =>
        config.params.page === 0
          ? [200, pageOf([30, 20], 0, false)]
          : [200, pageOf([20, 10], 1, true)]
      );
    renderPage();
    await screen.findByRole('link', { name: 'Post 30' });

    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await screen.findByRole('link', { name: 'Post 10' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Post 20' })).toHaveLength(1);
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('says the list may be out of date when a reload fails, and keeps the posts', async () => {
    mock.onGet('/forum/posts').reply(200, pageOf([30], 0, true));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ProfilePage />
      </QueryClientProvider>
    );
    await screen.findByRole('link', { name: 'Post 30' });

    mock.onGet('/forum/posts').reply(500);
    await client.invalidateQueries({ queryKey: ['author-posts'] });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not refresh your posts. What you see may be out of date.'
    );
    expect(screen.getByRole('link', { name: 'Post 30' })).toBeInTheDocument();
  });
});

describe('the sections of the profile', () => {
  it('shows only the posts as open, and the others as not available yet', async () => {
    mock.onGet('/forum/posts').reply(200, pageOf([1], 0, true));
    renderPage();

    const tabs = await screen.findByRole('list', { name: 'Profile sections' });
    expect(within(tabs).getByText('Posts')).toHaveAttribute('aria-current', 'true');
    for (const label of ['Comments', 'Saved', 'Activity']) {
      const tab = within(tabs).getByText(label, { exact: false }).closest('[aria-disabled]');
      expect(tab).toHaveAttribute('aria-disabled', 'true');
      expect(tab).toHaveTextContent('Not available yet');
      expect(tab).toHaveAttribute('title', 'Not available yet');
    }
    expect(within(tabs).queryAllByRole('button')).toHaveLength(0);
    expect(within(tabs).queryAllByRole('link')).toHaveLength(0);
  });
});
