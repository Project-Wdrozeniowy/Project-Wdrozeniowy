import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import DashboardPage from '@/pages/dashboard/ui/DashboardPage';
import { apiClient } from '@/shared/api/client/api';
import { toast } from '@/shared/lib/toast';
import { useStore } from '@/store';
import {
  fakeAnalyticsServer,
  makeActivity,
  makeComparison,
  makeCategories,
  DEFAULT_ANALYTICS,
  requestsTo,
} from '@/test/fakeAnalyticsServer';

/**
 * DashboardPage -> hooks -> generated operations -> the real ApiClient (axios, interceptors).
 * Only the network is faked, by stand-ins that answer as the analytics contract documents.
 */

vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <DashboardPage />
      </QueryClientProvider>
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  useStore.setState({ isAuthenticated: true });
});

afterEach(() => mock.restore());

// "Posts" and "Comments" are also the names of the chart's metric choice: look for the figure cards.
const card = (label: string) =>
  screen
    .getAllByText(label)
    .find((node) => !node.closest('fieldset'))!
    .closest('div')!.parentElement!;

describe('showing the real figures', () => {
  it("shows the public figures with their change, and the user's own", async () => {
    fakeAnalyticsServer(mock);
    renderPage();

    expect(await screen.findByText('60')).toBeInTheDocument();
    const posts = within(card('Posts'));
    expect(posts.getByText('60')).toBeInTheDocument();
    expect(posts.getByText('+50% vs the window before')).toBeInTheDocument();
    const comments = within(card('Comments'));
    expect(comments.getByText('100')).toBeInTheDocument();
    // The previous window had no comments, so there is nothing to compare with.
    expect(comments.getByText('No earlier data to compare')).toBeInTheDocument();
    expect(within(card('Your posts')).getByText('12')).toBeInTheDocument();
    expect(within(card('Upvotes you received')).getByText('300')).toBeInTheDocument();
    expect(screen.getAllByText('All time')).toHaveLength(2);
  });

  it('draws the activity chart and the category chart with a text alternative of the values', async () => {
    fakeAnalyticsServer(mock);
    renderPage();

    expect(
      await screen.findByRole('img', {
        name: 'Posts per day, Last 7 days, UTC. Nov 16, 2026: 20 posts, Nov 17, 2026: 30 posts, Nov 18, 2026: 10 posts',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Posts by category, Last 7 days, UTC. AI / Tech: 35, Gaming: 20, No category: 5',
      })
    ).toBeInTheDocument();
  });

  it('switches the activity chart between posts and comments, and lists the days in a table', async () => {
    fakeAnalyticsServer(mock);
    renderPage();
    await screen.findByRole('img', { name: /^Posts per day/ });

    await userEvent.click(screen.getByRole('radio', { name: 'Comments' }));

    expect(
      screen.getByRole('img', {
        name: 'Comments per day, Last 7 days, UTC. Nov 16, 2026: 50 comments, Nov 17, 2026: 30 comments, Nov 18, 2026: 20 comments',
      })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Data table' }));
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Comments' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Nov 17, 2026' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '30' })).toBeInTheDocument();
  });

  it('lists the most active posts as the server ranks them, each with a link', async () => {
    fakeAnalyticsServer(mock);
    renderPage();

    const hot = await screen.findByRole('link', { name: 'Hot this week' });
    expect(hot).toHaveAttribute('href', '/forum/post-1');
    const rows = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('12 comments · 1,200 views');
    expect(rows[0]).toHaveTextContent('42');
    expect(within(rows[1]).getByRole('link', { name: 'Second best' })).toBeInTheDocument();
  });

  it('asks for the five most active posts of the window', async () => {
    fakeAnalyticsServer(mock);
    renderPage();
    await screen.findByRole('link', { name: 'Hot this week' });

    expect(requestsTo(mock, '/analytics/trending-posts')[0].params).toEqual({
      period: '7d',
      limit: 5,
    });
  });
});

describe('the time window', () => {
  it('asks every endpoint again for 30 days and shows the answers', async () => {
    fakeAnalyticsServer(mock);
    renderPage();
    await screen.findByText('60');
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await userEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));

    expect(await screen.findByText('210')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getAllByText('Last 30 days').length).toBeGreaterThan(0);
    for (const url of [
      '/analytics/public/comparison',
      '/analytics/public/activity',
      '/analytics/public/categories',
      '/analytics/trending-posts',
    ]) {
      expect(requestsTo(mock, url).some((request) => request.params.period === '30d')).toBe(true);
    }
    expect(await screen.findByRole('link', { name: 'Hot this month' })).toBeInTheDocument();
  });
});

describe('when there is nothing or something fails', () => {
  it('says so for a window with no activity, and for no active post', async () => {
    fakeAnalyticsServer(mock, {
      activity: () => makeActivity([['2026-11-18', 0, 0]]),
      categories: () => makeCategories([['Quiet', 0]]),
      trending: () => [],
    });
    renderPage();

    expect(
      await screen.findByText('No post has had activity in this window yet.')
    ).toBeInTheDocument();
    // Both endpoints return rows with real zero counts, not missing rows.
    expect(screen.getByText('No posts recorded in this period.')).toBeInTheDocument();
    expect(screen.getByText('No public posts in this window yet.')).toBeInTheDocument();
  });

  it('shows "Not available" for a figure that failed, with no toast and no server text', async () => {
    fakeAnalyticsServer(mock);
    mock.onGet('/analytics/public/comparison').reply(500, { detail: 'PSQLException at db:5432' });
    renderPage();

    expect(await screen.findAllByText('Not available')).toHaveLength(2);
    expect(document.body).not.toHaveTextContent('PSQLException');
    expect(toast.error).not.toHaveBeenCalled();
    expect(within(card('Your posts')).getByText('12')).toBeInTheDocument();
  });

  it('shows "Not available" for the user\'s own figures when they fail', async () => {
    fakeAnalyticsServer(mock);
    mock.onGet('/analytics/me').reply(500);
    renderPage();

    await screen.findByText('60');
    await waitFor(() => expect(screen.getAllByText('Not available')).toHaveLength(2));
  });

  it('lets the user retry a failed chart, and shows it afterwards', async () => {
    // The first answer is registered before the stand-in, which answers once it has been used.
    mock.onGet('/analytics/public/activity').replyOnce(500, { detail: 'stack trace' });
    fakeAnalyticsServer(mock);
    renderPage();

    const alerts = await screen.findAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent('We could not load this. Please try again.');
    expect(document.body).not.toHaveTextContent('stack trace');

    await userEvent.click(within(alerts[0]).getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('img', { name: /Posts per day, Last 7 days/ })
    ).toBeInTheDocument();
  });

  it('shows how many posts a window has when the previous one had none to compare', async () => {
    fakeAnalyticsServer(mock, { comparison: () => makeComparison(0, 0) });
    renderPage();

    expect(await screen.findAllByText('-100% vs the window before')).toHaveLength(1);
  });

  it('keeps the last figures when a refresh fails, instead of "Not available"', async () => {
    fakeAnalyticsServer(mock);
    const { client } = renderPage();
    expect(await screen.findByText('60')).toBeInTheDocument();

    mock.onGet('/analytics/public/comparison').reply(500);
    await client.invalidateQueries({ queryKey: ['/analytics/public/comparison'] });

    await waitFor(() =>
      expect(requestsTo(mock, '/analytics/public/comparison').length).toBeGreaterThan(1)
    );
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.queryByText('Not available')).not.toBeInTheDocument();
  });

  it('offers a guest the public figures only: no own totals, no request for them, nothing broken', async () => {
    fakeAnalyticsServer(mock);
    useStore.setState({ isAuthenticated: false });
    renderPage();

    await screen.findByText('60');
    expect(card('Posts')).toBeInTheDocument();
    expect(card('Comments')).toBeInTheDocument();
    expect(screen.queryByText('Your posts')).not.toBeInTheDocument();
    expect(screen.queryByText('Upvotes you received')).not.toBeInTheDocument();
    expect(screen.queryByText('Not available')).not.toBeInTheDocument();
    expect(requestsTo(mock, '/analytics/me')).toHaveLength(0);
  });
});

describe('category distribution integration', () => {
  it('keeps public totals, API shares, the graph and the table consistent for both windows', async () => {
    fakeAnalyticsServer(mock);
    useStore.setState({ isAuthenticated: false });
    renderPage();
    const categories = screen.getByRole('region', { name: 'Posts by category' });
    for (const period of ['7d', '30d'] as const) {
      if (period === '30d')
        await userEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));
      const expected = DEFAULT_ANALYTICS.categories(period);
      await within(categories).findByText(`${expected.totalPosts} public posts`);
      expect(expected.totalPosts).toBe(DEFAULT_ANALYTICS.activity(period).totalPosts);
      expect(expected.totalPosts).toBe(DEFAULT_ANALYTICS.comparison(period).posts.current);
      const toggle = within(categories).getByRole('button', { name: 'Category data table' });
      if (toggle.getAttribute('aria-expanded') === 'false') await userEvent.click(toggle);
      const table = within(categories).getByRole('table');
      for (const row of expected.categories) {
        const header = within(table).getByRole('rowheader', {
          name: row.category?.name ?? 'No category',
        });
        expect(header.parentElement).toHaveTextContent(String(row.posts));
      }
      expect(
        requestsTo(mock, '/analytics/public/categories').filter(
          (request) => request.params.period === period
        )
      ).toHaveLength(1);
    }
    expect(requestsTo(mock, '/analytics/me')).toHaveLength(0);
    expect(mock.history.post).toHaveLength(0);
  });

  it('isolates a category failure from activity and the other dashboard sections', async () => {
    fakeAnalyticsServer(mock);
    mock.onGet('/analytics/public/categories').reply(500);
    renderPage();
    expect(await screen.findByRole('img', { name: /^Posts per day/ })).toBeInTheDocument();
    const categories = screen.getByRole('region', { name: 'Posts by category' });
    expect(await within(categories).findByRole('alert')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Hot this week' })).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
