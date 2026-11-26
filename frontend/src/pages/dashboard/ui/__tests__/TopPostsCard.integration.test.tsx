import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import TopPostsCard from '@/pages/dashboard/ui/TopPostsCard';
import { TOP_POSTS_LIMIT, type AnalyticsPeriod } from '@/shared/api/analytics/analytics.const';
import { apiClient } from '@/shared/api/client/api';
import { toast } from '@/shared/lib/toast';
import { makePost } from '@/test/fakeAnalyticsServer';

/**
 * TopPostsCard -> useTrendingPosts -> the generated operation -> the real ApiClient. Only the
 * network is faked, and answers as the trending-posts contract documents.
 */

vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

const TRENDING = {
  '7d': [
    makePost(1, 'Week leader', {
      slug: 'week-leader',
      viewCount: 1200,
      voteScore: 42,
      commentCount: 12,
      category: {
        id: 2,
        name: 'Gaming',
        slug: 'gaming',
        description: null,
        displayOrder: 1,
        visible: true,
        createdAt: '2026-10-01T10:00:00Z',
      },
    }),
    makePost(2, 'A very long title that goes on and on about a rather specific topic', {
      slug: 'a slug/with spaces',
    }),
  ],
  '30d': [makePost(3, 'Month leader', { slug: 'month-leader' })],
};

function renderCard(period: AnalyticsPeriod = '7d') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = (value: AnalyticsPeriod) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TopPostsCard period={value} />
      </MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(tree(period));
  return { client, ...view, setPeriod: (value: AnalyticsPeriod) => view.rerender(tree(value)) };
}

const asked = () =>
  mock.history.get.filter((request) => request.url === '/analytics/trending-posts');
const card = () => screen.getByRole('region', { name: 'Most active posts' });

beforeEach(() => {
  vi.clearAllMocks();
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  mock
    .onGet('/analytics/trending-posts')
    .reply((config) => [200, TRENDING[config.params.period as AnalyticsPeriod]]);
});
afterEach(() => mock.restore());

describe('the top posts of the window', () => {
  it('lists the posts in the order of the API, each title a link to its own page', async () => {
    renderCard();

    const first = await screen.findByRole('link', { name: 'Week leader' });
    expect(first).toHaveAttribute('href', '/forum/week-leader');
    // The slug is encoded, never trusted as a path.
    expect(screen.getByRole('link', { name: /A very long title/ })).toHaveAttribute(
      'href',
      '/forum/a%20slug%2Fwith%20spaces'
    );
    const rows = within(card())
      .getAllByRole('listitem')
      .filter((row) => row.querySelector('a'));
    expect(rows.map((row) => row.querySelector('a')?.textContent)).toEqual([
      'Week leader',
      'A very long title that goes on and on about a rather specific topic',
    ]);
  });

  it('asks for the five most active posts of the window, and again for another window', async () => {
    const { setPeriod } = renderCard('7d');
    await screen.findByRole('link', { name: 'Week leader' });

    setPeriod('30d');

    expect(await screen.findByRole('link', { name: 'Month leader' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Week leader' })).not.toBeInTheDocument();
    expect(asked().map((request) => request.params)).toEqual([
      { period: '7d', limit: 5 },
      { period: '30d', limit: 5 },
    ]);
  });

  it('does not show the posts of the previous window while the next one loads', async () => {
    let finish: () => void = () => {};
    const { setPeriod } = renderCard('7d');
    await screen.findByRole('link', { name: 'Week leader' });
    mock.resetHandlers();
    mock
      .onGet('/analytics/trending-posts')
      .reply(() => new Promise((resolve) => (finish = () => resolve([200, TRENDING['30d']]))));

    setPeriod('30d');

    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Week leader' })).not.toBeInTheDocument()
    );
    expect(screen.getByRole('status', { name: 'Loading top posts' })).toBeInTheDocument();
    finish();
    expect(await screen.findByRole('link', { name: 'Month leader' })).toBeInTheDocument();
  });
});

describe('what the card says about the ranking', () => {
  it.each([
    ['7d', '7 days (168 hours)'],
    ['30d', '30 days (720 hours)'],
  ] as const)('names the formula and the span of %s from the contract', async (period, span) => {
    renderCard(period);
    await screen.findByRole('link', { name: /leader/ });

    expect(card()).toHaveTextContent(
      `Ranked by openings + 2 × votes + 3 × comments, counted over the ${span} before now.`
    );
  });

  it('keeps the ties, the span and who is listed one click away, as text', async () => {
    renderCard();
    await screen.findByRole('link', { name: 'Week leader' });

    const summary = within(card()).getByText('How posts are ranked');
    const details = summary.closest('details')!;
    expect(details).not.toHaveAttribute('open');
    await userEvent.click(summary);

    expect(details).toHaveAttribute('open');
    expect(details).toHaveTextContent('Each opening of a post counts 1, each vote cast on it');
    expect(details).toHaveTextContent(
      'vote score, then the more recent activity, then the newer post'
    );
    expect(details).toHaveTextContent('not whole UTC days');
    expect(details).toHaveTextContent('published or locked posts');
    expect(details).toHaveTextContent('fewer than 5');
  });

  it('shows the totals of a post over all time, said so, and never as the score', async () => {
    renderCard();
    const row = (await screen.findByRole('link', { name: 'Week leader' })).closest('li')!;

    expect(row).toHaveTextContent('Totals over all time: 1,200 views 42 vote score 12 comments');
    expect(within(row).getByText('Gaming')).toBeInTheDocument();
    expect(card()).toHaveTextContent('Numbers under each title are totals over all time.');
    expect(within(card()).queryByText(/^score$/i)).not.toBeInTheDocument();
  });
});

describe('the rules and the constants they come from', () => {
  it('say the same weights as the formula, and the size of the list the card asks for', async () => {
    renderCard();
    await screen.findByRole('link', { name: 'Week leader' });
    await userEvent.click(within(card()).getByText('How posts are ranked'));

    // Formula and rule are built from the same weights.
    expect(card()).toHaveTextContent('openings + 2 × votes + 3 × comments');
    expect(card()).toHaveTextContent(
      'Each opening of a post counts 1, each vote cast on it (up or down) counts 2 and each visible comment counts 3'
    );
    expect(card()).toHaveTextContent(`fewer than ${TOP_POSTS_LIMIT}.`);
  });
});

describe('when there is nothing or something fails', () => {
  it('says so, with no post, when no post had activity in the window', async () => {
    mock.resetHandlers();
    mock.onGet('/analytics/trending-posts').reply(200, []);
    renderCard();

    expect(
      await within(card()).findByText('No post has had activity in this window yet.')
    ).toBeInTheDocument();
    expect(within(card()).queryAllByRole('link')).toHaveLength(0);
    expect(within(card()).queryByRole('list', { name: /ranked/ })).not.toBeInTheDocument();
  });

  it('says it failed, with a retry and no post, and nothing of the server', async () => {
    mock.resetHandlers();
    mock.onGet('/analytics/trending-posts').replyOnce(500, { detail: 'PSQLException secret' });
    mock.onGet('/analytics/trending-posts').reply(200, TRENDING['7d']);
    renderCard();

    const alert = await within(card()).findByRole('alert');
    expect(alert).toHaveTextContent('We could not load this. Please try again.');
    expect(within(card()).queryAllByRole('link')).toHaveLength(0);
    expect(document.body).not.toHaveTextContent('PSQLException');
    expect(toast.error).not.toHaveBeenCalled();

    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'Week leader' })).toBeInTheDocument();
    expect(within(card()).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says a refresh failed, with a retry, also when the list it keeps is empty', async () => {
    mock.resetHandlers();
    mock.onGet('/analytics/trending-posts').reply(200, []);
    const { client } = renderCard();
    await within(card()).findByText('No post has had activity in this window yet.');

    mock.resetHandlers();
    mock.onGet('/analytics/trending-posts').reply(500);
    await client.invalidateQueries({ queryKey: ['/analytics/trending-posts'] });

    const alert = await within(card()).findByRole('alert');
    expect(alert).toHaveTextContent('Could not update the top posts.');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('keeps the last posts, with a notice and a retry, when a refresh fails', async () => {
    const { client } = renderCard();
    await screen.findByRole('link', { name: 'Week leader' });

    mock.resetHandlers();
    mock.onGet('/analytics/trending-posts').reply(500, { detail: 'PSQLException secret' });
    await client.invalidateQueries({ queryKey: ['/analytics/trending-posts'] });

    const alert = await within(card()).findByRole('alert');
    expect(alert).toHaveTextContent(
      'Could not update the top posts. Showing the last loaded data.'
    );
    expect(screen.getByRole('link', { name: 'Week leader' })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('PSQLException');
  });
});

describe('by keyboard', () => {
  it('reaches every title in the ranked order, the rules first', async () => {
    renderCard();
    await screen.findByRole('link', { name: 'Week leader' });
    const user = userEvent.setup();

    // The rules are a native disclosure, in the page before the list.
    const summary = within(card()).getByText('How posts are ranked');
    const first = screen.getByRole('link', { name: 'Week leader' });
    expect(summary.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    first.focus();
    await user.tab();
    expect(screen.getByRole('link', { name: /A very long title/ })).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(first).toHaveFocus();
  });
});
