import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import PostInsights from '@/pages/post/ui/PostInsights';
import { apiClient } from '@/shared/api/client/api';
import type { PostDto } from '@/shared/api/generated/models/postDto.dto';
import { getPublicSummaryQueryKey } from '@/shared/api/generated/orbita.api';
import { SIGNED_OUT, signInUser } from '@/test/session';
import { useStore } from '@/store';

vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: vi.fn() },
}));
const post = { id: 5, slug: 'hello', status: 'PUBLISHED', author: { id: 1 } } as PostDto;
const summary = {
  postId: 5,
  viewCount: 1284,
  commentCount: 2,
  voteScore: -1,
  collectedFrom: '2026-11-08T23:30:00-02:00',
};
// Three days before collection began, then a day without openings, then days with some. The last
// day is the current one: it is still counting up.
const trend = {
  postId: 5,
  period: '7d',
  collectedFrom: '2026-11-08T10:15:00Z',
  generatedAt: '2026-11-11T14:30:00Z',
  windowStart: '2026-11-05T00:00:00Z',
  windowEnd: '2026-11-12T00:00:00Z',
  totalOpenings: 16,
  days: [
    { date: '2026-11-05', measured: false, openings: null },
    { date: '2026-11-06', measured: false, openings: null },
    { date: '2026-11-07', measured: false, openings: null },
    { date: '2026-11-08', measured: true, openings: 4 },
    { date: '2026-11-09', measured: true, openings: 0 },
    { date: '2026-11-10', measured: true, openings: 8 },
    { date: '2026-11-11', measured: true, openings: 4 },
  ],
};
const trend30 = {
  ...trend,
  period: '30d',
  days: [
    { date: '2026-11-10', measured: true, openings: 7 },
    { date: '2026-11-11', measured: true, openings: 2 },
  ],
};
const TREND_URL = '/analytics/me/posts/5/openings';
let mock: MockAdapter;
let client: QueryClient;
const refreshPost = vi.fn();
beforeEach(() => {
  useStore.setState(SIGNED_OUT);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mock = new MockAdapter((apiClient as unknown as { client: AxiosInstance }).client);
  refreshPost.mockReset().mockResolvedValue({ isError: false });
});
afterEach(() => {
  client.clear();
  mock.restore();
});

function mount(value = post) {
  return render(
    <QueryClientProvider client={client}>
      <PostInsights post={value} onRefreshPost={refreshPost} />
    </QueryClientProvider>
  );
}

async function ready(owner = false) {
  if (owner) {
    signInUser(client, { id: 1, username: 'alice' });
    mock
      .onGet('/analytics/me/posts/5')
      .reply(200, { ...summary, upvoteCount: 3, downvoteCount: 4 });
    mock.onGet(TREND_URL, { params: { period: '7d' } }).reply(200, trend);
  } else mock.onGet('/analytics/public/posts/5').reply(200, summary);
  const view = mount();
  await screen.findByRole('button', { name: 'Expand' });
  return view;
}

it('announces initial loading without a fabricated refresh control', () => {
  mock.onGet('/analytics/public/posts/5').reply(() => new Promise(() => {}));
  mount();
  expect(screen.getByRole('status', { name: 'Loading post insights' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Refresh insights' })).not.toBeInTheDocument();
});

it('discloses public openings by keyboard without another read', async () => {
  await ready();
  expect(screen.getByText('-1')).toBeVisible();
  expect(screen.queryByText('1,284')).not.toBeInTheDocument();
  const expand = screen.getByRole('button', { name: 'Expand' });
  expand.focus();
  await userEvent.keyboard('{Enter}');
  expect(expand).toHaveFocus();
  expect(expand).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('1,284')).toBeVisible();
  expect(screen.getByText(/^since Nov 9, 2026/)).toBeVisible();
  expect(screen.getByText(/They are not unique readers/)).toBeVisible();
  await userEvent.keyboard(' ');
  expect(expand).toHaveAttribute('aria-expanded', 'false');
  expect(mock.history.get).toHaveLength(1);
});

it('starts the author compact with a measured seven-day subtotal and separate expansion', async () => {
  await ready(true);
  expect(screen.getByText('Last 7 days: 16 openings')).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Daily openings' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Expand' }));
  expect(screen.getByRole('heading', { name: 'Daily openings' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Collapse' })).toHaveFocus();
  const table = screen.getByRole('button', { name: 'Data table' });
  expect(table).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(table);
  const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
  expect(rows.map((row) => within(row).getByRole('cell').textContent)).toEqual([
    'Not measured',
    'Not measured',
    'Not measured',
    '4',
    '0',
    '8',
    '4',
  ]);
  expect(within(rows.at(-1)!).getByRole('rowheader')).toHaveTextContent(
    '2026-11-11 (today, partial)'
  );
  expect(screen.getByRole('img')).toHaveAccessibleName(
    /Last 7 days.*not measured.*0 openings.*today, partial/
  );
});

it('keeps the period switch mounted and focused while another period loads', async () => {
  await ready(true);
  mock.onGet(TREND_URL, { params: { period: '30d' } }).reply(() => new Promise(() => {}));
  await userEvent.click(screen.getByRole('button', { name: 'Expand' }));
  const choice = screen.getByRole('radio', { name: '7 days' });
  choice.focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(screen.getByRole('radio', { name: '30 days' })).toHaveFocus();
  expect(screen.getByRole('status', { name: 'Loading chart' })).toBeVisible();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

it('returns a thirty-day expanded view to a seven-day compact preview', async () => {
  await ready(true);
  mock.onGet(TREND_URL, { params: { period: '30d' } }).reply(200, {
    ...trend30,
    totalOpenings: 109,
    days: [{ date: '2026-10-20', measured: true, openings: 100 }, ...trend.days.slice(-6)],
  });
  await userEvent.click(screen.getByRole('button', { name: 'Expand' }));
  await userEvent.click(screen.getByRole('radio', { name: '30 days' }));
  await screen.findByRole('img', { name: /Last 30 days/ });
  await userEvent.click(screen.getByRole('button', { name: 'Collapse' }));
  expect(screen.getByText('Last 7 days: 116 openings')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Expand' }));
  expect(screen.getByRole('radio', { name: '30 days' })).toBeChecked();
});

it.each(['DRAFT', 'DELETED'] as const)(
  'requests nothing for another account viewing %s',
  (status) => {
    signInUser(client, { id: 2, username: 'staff', role: 'ADMIN' });
    expect(mount({ ...post, status }).container).toBeEmptyDOMElement();
    expect(mock.history.get).toHaveLength(0);
  }
);

it('shows the draft author breakdown without public reads', async () => {
  signInUser(client, { id: 1, username: 'alice' });
  mock.onGet('/analytics/me/posts/5').reply(200, { ...summary, upvoteCount: 3, downvoteCount: 4 });
  mock.onGet(TREND_URL).reply(200, trend);
  mount({ ...post, status: 'DRAFT' });
  expect(await screen.findByText('3 upvotes · 4 downvotes')).toBeVisible();
  expect(mock.history.get.some((r) => r.url?.includes('/public/'))).toBe(false);
});

it.each([500, 403, 404, 429, 401])(
  'represents %i safely and replaces stale figures',
  async (status) => {
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    client.setQueryData(getPublicSummaryQueryKey(5), summary);
    mock
      .onGet('/analytics/public/posts/5')
      .reply(status, { detail: 'PSQLException at secret.internal' });
    mount();
    expect(await screen.findByRole('alert')).not.toHaveTextContent(/PSQL|secret/);
    expect(screen.queryByText('-1')).not.toBeInTheDocument();
    if (status === 404)
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['/forum/posts/hello'] });
  }
);

it.each([false, true])(
  'handles initial series failure and refetch failure without stale numbers (%s)',
  async (background) => {
    if (background) {
      await ready(true);
      mock.onGet(TREND_URL, { params: { period: '7d' } }).reply(500, { detail: 'database secret' });
      await act(async () => {
        await client.invalidateQueries({ queryKey: ['/analytics/me/posts/5/openings'] });
      });
    } else {
      signInUser(client, { id: 1, username: 'alice' });
      mock
        .onGet('/analytics/me/posts/5')
        .reply(200, { ...summary, upvoteCount: 3, downvoteCount: 4 });
      mock.onGet(TREND_URL).reply(500);
      mount();
    }
    expect(await screen.findByRole('alert')).toHaveTextContent('Insights could not be loaded');
    expect(screen.queryByText('1,284')).not.toBeInTheDocument();
    expect(screen.queryByText(/Last 7 days:/)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('database secret');
  }
);

it('retains Retry on another failure and restores focus after recovery', async () => {
  mock.onGet('/analytics/public/posts/5').networkErrorOnce();
  mock.onGet('/analytics/public/posts/5').replyOnce(500);
  mock.onGet('/analytics/public/posts/5').reply(200, summary);
  mount();
  const retry = await screen.findByRole('button', { name: 'Try again' });
  retry.focus();
  await userEvent.keyboard('{Enter}');
  await waitFor(() => expect(retry).toHaveTextContent('Try again'));
  expect(retry).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Expand' })).toHaveFocus());
  expect(refreshPost).toHaveBeenCalledTimes(2);
});

it('does not claim recovery if the article read fails', async () => {
  mock.onGet('/analytics/public/posts/5').networkErrorOnce();
  mock.onGet('/analytics/public/posts/5').reply(200, summary);
  refreshPost.mockResolvedValueOnce({ isError: true });
  mount();
  await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(
    await screen.findByText('The post could not be refreshed. Please try again.')
  ).toBeVisible();
  expect(screen.queryByText('-1')).not.toBeInTheDocument();
});

it('does not steal focus after the reader leaves a pending retry', async () => {
  mock.onGet('/analytics/public/posts/5').networkErrorOnce();
  let finish!: (answer: [number, typeof summary]) => void;
  mock.onGet('/analytics/public/posts/5').reply(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  mount();
  await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  const outside = document.createElement('button');
  document.body.append(outside);
  outside.focus();
  await act(async () => {
    finish([200, summary]);
  });
  await screen.findByRole('button', { name: 'Expand' });
  expect(outside).toHaveFocus();
  outside.remove();
});

it('discards author presentation when another account takes over', async () => {
  await ready(true);
  mock.onGet('/analytics/public/posts/5').reply(200, summary);
  await userEvent.click(screen.getByRole('button', { name: 'Expand' }));
  await act(async () => {
    signInUser(client, { id: 2, username: 'bob' });
  });
  await screen.findByRole('button', { name: 'Expand' });
  expect(screen.queryByText(/3 upvotes/)).not.toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

it('resets expansion across post navigation', async () => {
  const view = await ready();
  await userEvent.click(screen.getByRole('button', { name: 'Expand' }));
  mock.onGet('/analytics/public/posts/6').reply(200, { ...summary, postId: 6, voteScore: 19 });
  view.rerender(
    <QueryClientProvider client={client}>
      <PostInsights post={{ ...post, id: 6 }} onRefreshPost={refreshPost} />
    </QueryClientProvider>
  );
  expect(await screen.findByText('19')).toBeVisible();
  expect(screen.queryByText('1,284')).not.toBeInTheDocument();
});

it('distinguishes measured zeros and missing values in the same chart/table', async () => {
  await ready(true);
  mock.onGet(TREND_URL, { params: { period: '7d' } }).reply(200, {
    ...trend,
    days: trend.days.map((day) => ({ ...day, measured: true, openings: 0 })),
    totalOpenings: 0,
  });
  await act(async () => {
    await client.invalidateQueries({ queryKey: ['/analytics/me/posts/5/openings'] });
  });
  await userEvent.click(screen.getByRole('button', { name: 'Expand' }));
  expect(screen.getByText('No openings recorded in this period.')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Data table' }));
  expect(within(screen.getByRole('table')).getAllByRole('cell', { name: '0' })).toHaveLength(7);
});
