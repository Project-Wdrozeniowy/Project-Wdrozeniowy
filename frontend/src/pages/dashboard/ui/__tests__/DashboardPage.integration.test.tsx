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

describe('what each card says about its figures', () => {
  it('names the UTC window, the read time and that today may grow, on every card', async () => {
    fakeAnalyticsServer(mock);
    useStore.setState({ isAuthenticated: false });
    renderPage();

    const figures = await screen.findByRole('region', { name: 'Key figures' });
    await within(figures).findByText('60');
    expect(figures).toHaveTextContent(
      'Counted from Nov 12, 2026, 00:00 UTC up to the read time. Updated Nov 18, 2026, 10:00 UTC. Counts for today may grow.'
    );

    const chart = screen.getByRole('region', { name: 'Posts and comments by day' });
    await within(chart).findByRole('img');
    expect(chart).toHaveTextContent('60 public posts and 100 comments in this window');
    expect(chart).toHaveTextContent('Nov 12, 2026 – Nov 19, 2026 (end exclusive), UTC');
    expect(chart).toHaveTextContent('Updated Nov 18, 2026, 10:00 UTC');
    expect(chart).toHaveTextContent('Counts for today may grow.');
    expect(within(chart).getByText('Nov 18, 2026, 10:00 UTC').tagName).toBe('TIME');
    expect(within(chart).getByText('Nov 18, 2026, 10:00 UTC')).toHaveAttribute(
      'datetime',
      '2026-11-18T10:00:00Z'
    );

    const categories = screen.getByRole('region', { name: 'Posts by category' });
    await within(categories).findByText('60 public posts');
    expect(categories).toHaveTextContent('Counts for today may grow.');
  });

  it('draws the activity as one bar per day, as in the design, and not as a line', async () => {
    fakeAnalyticsServer(mock);
    renderPage();
    const chart = screen.getByRole('region', { name: 'Posts and comments by day' });
    await within(chart).findByRole('img');

    expect(chart.querySelectorAll('rect[data-point="measured"]')).toHaveLength(
      DEFAULT_ANALYTICS.activity('7d').days.length
    );
    expect(chart.querySelectorAll('circle[data-point]')).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));
    await waitFor(() =>
      expect(chart.querySelectorAll('rect[data-point="measured"]')).toHaveLength(
        DEFAULT_ANALYTICS.activity('30d').days.length
      )
    );
  });

  it('gives the posts and the comments card their own picture', async () => {
    fakeAnalyticsServer(mock);
    renderPage();
    await screen.findByText('60');

    const picture = (label: string) => card(label).querySelector('svg')?.innerHTML ?? '';
    expect(picture('Posts')).not.toBe('');
    expect(picture('Posts')).not.toBe(picture('Comments'));
    expect(picture('Your posts')).not.toBe(picture('Upvotes you received'));
  });

  it('shows the key figures note after every card, and no empty row while loading', async () => {
    fakeAnalyticsServer(mock);
    renderPage();
    const figures = screen.getByRole('region', { name: 'Key figures' });
    // Loading: the cards are there, no note row yet.
    // The four cards and nothing else: an empty row would leave a gap that then jumps.
    expect(figures.children).toHaveLength(4);

    await screen.findByText('Your posts');
    const note = await within(figures).findByText(/Counted from/);
    const lastCard = card('Upvotes you received');
    expect(lastCard.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('makes no claim of live data anywhere on the page', async () => {
    fakeAnalyticsServer(mock);
    useStore.setState({ isAuthenticated: false });
    renderPage();
    await screen.findByRole('img', { name: /Posts per day/ });

    // The cards the page words itself; the top posts are users' titles.
    for (const name of ['Key figures', 'Posts and comments by day', 'Posts by category']) {
      const region = screen.getByRole('region', { name });
      expect(region.textContent).not.toMatch(/real-time|realtime|\blive\b|right now/i);
    }
    expect(screen.getByRole('heading', { level: 1 }).parentElement?.textContent).not.toMatch(
      /real-time|realtime|\blive\b|right now/i
    );
  });

  it('shows the same totals in the key figures, the chart and the categories, in both windows', async () => {
    fakeAnalyticsServer(mock);
    useStore.setState({ isAuthenticated: false });
    renderPage();
    const figures = await screen.findByRole('region', { name: 'Key figures' });
    const chart = screen.getByRole('region', { name: 'Posts and comments by day' });
    const categories = screen.getByRole('region', { name: 'Posts by category' });

    for (const period of ['7d', '30d'] as const) {
      if (period === '30d')
        await userEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));
      const { posts, comments } = DEFAULT_ANALYTICS.comparison(period);
      await within(chart).findByText(
        new RegExp(`^${posts.current} public posts and ${comments.current} comments`)
      );
      await within(categories).findByText(`${posts.current} public posts`);
      expect(within(figures).getByText(String(posts.current))).toBeInTheDocument();
      expect(within(figures).getByText(String(comments.current))).toBeInTheDocument();
    }
  });

  it('shows the totals of an empty window as zeros, not as a missing figure', async () => {
    fakeAnalyticsServer(mock, {
      activity: () => makeActivity([['2026-11-18', 0, 0]]),
    });
    useStore.setState({ isAuthenticated: false });
    renderPage();

    const chart = screen.getByRole('region', { name: 'Posts and comments by day' });
    expect(await within(chart).findByText(/^0 public posts and 0 comments/)).toBeInTheDocument();
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

  it('keeps the last figures and says so, with a retry, when a refresh fails', async () => {
    fakeAnalyticsServer(mock);
    const { client } = renderPage();
    const figures = await screen.findByRole('region', { name: 'Key figures' });
    expect(await within(figures).findByText('60')).toBeInTheDocument();

    // The first handler that matches answers, so the failing one replaces the stand-ins.
    mock.resetHandlers();
    mock.onGet('/analytics/public/comparison').reply(500, { detail: 'PSQLException' });
    mock.onGet('/analytics/public/activity').reply(500, { detail: 'PSQLException' });
    await client.invalidateQueries({ queryKey: ['/analytics/public/comparison'] });
    await client.invalidateQueries({ queryKey: ['/analytics/public/activity'] });

    const keyAlert = await within(figures).findByRole('alert');
    expect(keyAlert).toHaveTextContent(
      'Could not update the key figures. Showing the last loaded data.'
    );
    const chart = screen.getByRole('region', { name: 'Posts and comments by day' });
    const chartAlert = await within(chart).findByRole('alert');
    expect(chartAlert).toHaveTextContent('Could not update the activity chart.');
    // The values stay, no figure turns into "Not available", and no server text or toast appears.
    expect(within(figures).getByText('60')).toBeInTheDocument();
    expect(
      within(chart).getByRole('img', { name: /Posts per day, Last 7 days/ })
    ).toBeInTheDocument();
    expect(screen.queryByText('Not available')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('PSQLException');
    expect(toast.error).not.toHaveBeenCalled();

    // Retry asks again, and the notices go once the answers are good.
    mock.resetHandlers();
    fakeAnalyticsServer(mock);
    await userEvent.click(within(keyAlert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(within(figures).queryByRole('alert')).not.toBeInTheDocument());
    await userEvent.click(within(chartAlert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(within(chart).queryByRole('alert')).not.toBeInTheDocument());
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
