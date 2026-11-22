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

const route = vi.hoisted(() => ({ search: '' }));
vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(route.search), vi.fn()],
  })
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

const SUMMARY = {
  userId: 1,
  username: 'alice',
  totalPosts: 12,
  totalComments: 5,
  totalUpvotesReceived: 290,
  totalDownvotesReceived: 7,
  totalVotesCast: 80,
  lastActivityAt: '2026-11-08T10:00:00.000Z',
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
  mock.onGet('/analytics/me').reply(200, SUMMARY);
  route.search = '';
  useStore.setState({ isAuthenticated: true, isInitialized: true });
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

  it('keeps the posts error and its focused button on screen while the retry runs', async () => {
    mock.onGet('/forum/posts').replyOnce(500, { detail: 'boom' });
    mock.onGet('/forum/posts').reply(() => new Promise(() => {}));
    renderPage();

    const alert = await screen.findByRole('alert');
    const retry = within(alert).getByRole('button', { name: 'Try again' });
    await userEvent.click(retry);

    const running = await screen.findByRole('button', { name: 'Trying again…' });
    expect(running).toBe(retry);
    expect(running).toHaveFocus();
    expect(screen.queryByRole('status', { name: 'Loading your posts' })).not.toBeInTheDocument();
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
  it('opens Posts and Activity, shows Comments and Saved as not available yet, and links to Settings', async () => {
    mock.onGet('/forum/posts').reply(200, pageOf([1], 0, true));
    renderPage();

    const tabs = await screen.findByRole('navigation', { name: 'Profile sections' });
    expect(within(tabs).getByRole('link', { name: 'Posts' })).toHaveAttribute('href', '/profile');
    expect(within(tabs).getByRole('link', { name: 'Posts' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(within(tabs).getByRole('link', { name: 'Activity' })).toHaveAttribute(
      'href',
      '/profile?tab=activity'
    );
    // Settings is the way to another page, not a section: it is outside the list of sections.
    expect(within(tabs).queryByRole('link', { name: 'Settings' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    for (const label of ['Comments', 'Saved']) {
      const tab = within(tabs).getByText(label, { exact: false }).closest('[aria-disabled]');
      expect(tab).toHaveAttribute('aria-disabled', 'true');
      expect(tab).toHaveTextContent('Not available yet');
      expect(tab).toHaveAttribute('title', 'Not available yet');
      // Nothing to press: no link or button of that name.
      expect(within(tabs).queryByRole('link', { name: new RegExp(label) })).toBeNull();
    }
  });

  it.each(['comments', 'saved', 'nonsense', ''])(
    'falls back to the posts for ?tab=%s, which cannot be opened',
    async (value) => {
      route.search = `tab=${value}`;
      mock.onGet('/forum/posts').reply(200, pageOf([1], 0, true));
      renderPage();

      expect(await screen.findByRole('region', { name: 'Posts' })).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Your activity' })).toBeNull();
    }
  );
});

describe('the vote totals in the profile card', () => {
  it('shows the totals of the signed-in user, all time', async () => {
    mock.onGet('/forum/posts').reply(200, pageOf([], 0, true));
    renderPage();

    expect(await screen.findByText('290')).toBeInTheDocument();
    expect(screen.getByText('Upvotes received')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Downvotes received')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('Votes cast')).toBeInTheDocument();
  });

  it('keeps the profile on screen and offers a retry when only the totals fail', async () => {
    mock.onGet('/analytics/me').reply(500, { message: 'database exploded' });
    mock.onGet('/forum/posts').reply(200, pageOf([], 0, true));
    renderPage();

    expect(
      await screen.findByText('We could not load your vote totals. Please try again.')
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.queryByText(/database exploded/)).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();

    mock.onGet('/analytics/me').reply(200, SUMMARY);
    await userEvent.setup().click(screen.getByRole('button', { name: /try again|retry/i }));
    expect(await screen.findByText('290')).toBeInTheDocument();
  });
});

describe('the Activity section', () => {
  beforeEach(() => {
    route.search = 'tab=activity';
  });

  it('shows the totals instead of the posts, with a truthful note about the missing chart', async () => {
    renderPage();

    const section = await screen.findByRole('region', { name: 'Your activity' });
    expect(await within(section).findByText('12')).toBeInTheDocument();
    expect(within(section).getByText('Posts')).toBeInTheDocument();
    expect(within(section).getByText('Comments')).toBeInTheDocument();
    expect(within(section).getByText('November 8, 2026')).toBeInTheDocument();
    // The vote totals are in the section, and the card does not repeat them.
    expect(within(section).getByText('Upvotes received')).toBeInTheDocument();
    expect(within(section).getByText('290')).toBeInTheDocument();
    expect(screen.getAllByText('290')).toHaveLength(1);
    expect(within(section).getByText(/over time is not available yet/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Posts' })).toBeNull();
    // The posts are not even requested while another section is open.
    expect(postRequests()).toHaveLength(0);
  });

  it('says there is no activity yet for an account that never did anything', async () => {
    mock
      .onGet('/analytics/me')
      .reply(200, { ...SUMMARY, totalPosts: 0, totalComments: 0, lastActivityAt: null });
    renderPage();

    const section = await screen.findByRole('region', { name: 'Your activity' });
    expect(await within(section).findByText('No activity yet')).toBeInTheDocument();
    expect(within(section).getAllByText('0')).toHaveLength(2);
  });

  it('says "Unknown", not "No activity yet", when the date is missing but the totals are not zero', async () => {
    mock.onGet('/analytics/me').reply(200, { ...SUMMARY, lastActivityAt: null });
    renderPage();

    const section = await screen.findByRole('region', { name: 'Your activity' });
    expect(await within(section).findByText('Unknown')).toBeInTheDocument();
    expect(within(section).queryByText('No activity yet')).toBeNull();
  });

  it('shows a failure once, with one retry, although the card and the section read the same totals', async () => {
    mock.onGet('/analytics/me').reply(500, { message: 'stack trace' });
    renderPage();

    await screen.findByText('We could not load your activity. Please try again.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /try again|retry/i })).toHaveLength(1);
  });

  it('shows a fixed message and a retry when the totals cannot be loaded', async () => {
    mock.onGet('/analytics/me').reply(500, { message: 'stack trace' });
    renderPage();

    const section = await screen.findByRole('region', { name: 'Your activity' });
    expect(
      await within(section).findByText('We could not load your activity. Please try again.')
    ).toBeVisible();
    expect(screen.queryByText(/stack trace/)).toBeNull();
  });
});
