import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import CommunityActivity from '@/widgets/sidebar/ui/CommunityActivity';
import TrendingTopics from '@/widgets/sidebar/ui/TrendingTopics';
import { apiClient } from '@/shared/api/client/api';
import { toast } from '@/shared/lib/toast';
import { useStore } from '@/store';
import {
  fakeAnalyticsServer,
  makeCategories,
  makeComparison,
  requestsTo,
} from '@/test/fakeAnalyticsServer';

/** The sidebar reads public data only, so it works for a guest too. */

vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

function renderWidget(widget: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{widget}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  useStore.setState({ user: null, isAuthenticated: false });
});

afterEach(() => mock.restore());

describe('CommunityActivity', () => {
  it('shows the posts and comments of the last seven days for a guest, with the change', async () => {
    fakeAnalyticsServer(mock);
    renderWidget(<CommunityActivity />);

    const region = await screen.findByRole('region', { name: 'Community activity' });
    expect(await within(region).findByText('60')).toBeInTheDocument();
    expect(within(region).getByText('+50%')).toBeInTheDocument();
    expect(within(region).getByText('100')).toBeInTheDocument();
    expect(within(region).getByText('Last 7 days')).toBeInTheDocument();
    expect(requestsTo(mock, '/analytics/public/comparison')[0].params).toEqual({ period: '7d' });
    expect(document.body).not.toHaveTextContent(/Online Users|Posts per minute/);
  });

  it('shows a round icon with each figure, and the figures are still read as text', async () => {
    fakeAnalyticsServer(mock);
    renderWidget(<CommunityActivity />);

    const region = await screen.findByRole('region', { name: 'Community activity' });
    await within(region).findByText('60');
    const terms = region.querySelectorAll('dt');
    expect(terms).toHaveLength(2);
    for (const term of terms) {
      expect(term.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
    }
    expect(within(region).getByText('Posts')).toBeInTheDocument();
    expect(within(region).getByText('Comments')).toBeInTheDocument();
  });

  it('shows a loading state first', () => {
    mock.onGet('/analytics/public/comparison').reply(() => new Promise(() => {}));
    renderWidget(<CommunityActivity />);

    expect(screen.getByRole('status', { name: 'Loading community activity' })).toBeInTheDocument();
  });

  it('shows no change when there is nothing to compare with', async () => {
    fakeAnalyticsServer(mock, { comparison: () => makeComparison(5, 0) });
    renderWidget(<CommunityActivity />);

    const region = await screen.findByRole('region', { name: 'Community activity' });
    await within(region).findByText('5');
    // Posts changed by +50%; comments had no earlier value, so only one change is shown.
    expect(within(region).getAllByText(/%$/)).toHaveLength(1);
  });

  it('fails with a fixed message and no toast, and retries', async () => {
    mock.onGet('/analytics/public/comparison').replyOnce(500, { detail: 'db is down' });
    renderWidget(<CommunityActivity />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load this. Please try again.');
    expect(document.body).not.toHaveTextContent('db is down');
    expect(toast.error).not.toHaveBeenCalled();

    fakeAnalyticsServer(mock);
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('60')).toBeInTheDocument();
  });
});

describe('TrendingTopics', () => {
  it('has the trending icon in its title', async () => {
    fakeAnalyticsServer(mock);
    renderWidget(<TrendingTopics />);

    const heading = await screen.findByRole('heading', { name: 'Trending Topics' });
    expect(heading.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('lists the categories with the most posts, each linking to the forum filtered by it', async () => {
    fakeAnalyticsServer(mock);
    renderWidget(<TrendingTopics />);

    const tech = await screen.findByRole('link', { name: /AI \/ Tech/ });
    expect(tech).toHaveAttribute('href', '/forum?topic=AI+%2F+Tech');
    expect(tech).toHaveTextContent('40 posts');
    expect(screen.getByRole('link', { name: /Gaming/ })).toHaveTextContent('20 posts');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(requestsTo(mock, '/analytics/public/categories')[0].params).toEqual({ period: '7d' });
  });

  it('leaves out posts without a category and says "post" for one', async () => {
    fakeAnalyticsServer(mock, {
      categories: () =>
        makeCategories([
          ['Gaming', 1],
          [null, 9],
        ]),
    });
    renderWidget(<TrendingTopics />);

    const link = await screen.findByRole('link', { name: /Gaming/ });
    expect(link).toHaveTextContent('1 post');
    expect(link).not.toHaveTextContent('1 posts');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('opens the whole forum for a category that is not a known topic', async () => {
    fakeAnalyticsServer(mock, { categories: () => makeCategories([['Chess club', 3]]) });
    renderWidget(<TrendingTopics />);

    expect(await screen.findByRole('link', { name: /Chess club/ })).toHaveAttribute(
      'href',
      '/forum'
    );
  });

  it('still filters the forum for a known category that was renamed', async () => {
    fakeAnalyticsServer(mock, { categories: () => makeCategories([['Technology', 7, 'ai']]) });
    renderWidget(<TrendingTopics />);

    expect(await screen.findByRole('link', { name: /Technology/ })).toHaveAttribute(
      'href',
      '/forum?topic=AI+%2F+Tech'
    );
  });

  it('gives each topic its own colour dot, and a neutral one to a category that is not a known topic', async () => {
    fakeAnalyticsServer(mock, {
      categories: () =>
        makeCategories([
          ['Gaming', 3],
          ['Chess club', 2],
        ]),
    });
    renderWidget(<TrendingTopics />);

    const gaming = await screen.findByRole('link', { name: /Gaming/ });
    const chess = screen.getByRole('link', { name: /Chess club/ });
    expect(gaming.querySelector('[aria-hidden="true"].rounded-full')).toHaveClass('bg-cat-gaming');
    expect(chess.querySelector('[aria-hidden="true"].rounded-full')).toHaveClass('bg-fg-subtle');
  });

  it('shows at most five', async () => {
    const rows: Array<[string, number]> = Array.from({ length: 8 }, (_, i) => [
      `Topic ${i}`,
      8 - i,
    ]);
    fakeAnalyticsServer(mock, { categories: () => makeCategories(rows) });
    renderWidget(<TrendingTopics />);

    await screen.findByRole('link', { name: /Topic 0/ });
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('says so when there are no posts', async () => {
    fakeAnalyticsServer(mock, { categories: () => makeCategories([]) });
    renderWidget(<TrendingTopics />);

    expect(await screen.findByText('No public posts in the last 7 days yet.')).toBeInTheDocument();
  });

  it('fails with a fixed message, and retries', async () => {
    mock.onGet('/analytics/public/categories').replyOnce(500);
    renderWidget(<TrendingTopics />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load this. Please try again.');

    fakeAnalyticsServer(mock);
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: /AI \/ Tech/ })).toBeInTheDocument();
  });

  it('shows a loading state first', () => {
    mock.onGet('/analytics/public/categories').reply(() => new Promise(() => {}));
    renderWidget(<TrendingTopics />);

    expect(screen.getByRole('status', { name: 'Loading trending topics' })).toBeInTheDocument();
  });
});
