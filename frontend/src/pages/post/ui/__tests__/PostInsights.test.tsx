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

it('announces the initial load and keeps the refresh control available', async () => {
  mock.onGet('/analytics/public/posts/5').reply(() => new Promise(() => {}));
  mount();
  expect(screen.getByRole('status', { name: 'Loading post insights' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Refresh insights' })).toHaveAttribute(
    'aria-disabled',
    'true'
  );
});

it('shows real public metrics and discloses openings with a UTC date by keyboard', async () => {
  mock.onGet('/analytics/public/posts/5').reply(200, summary);
  mount();
  const details = await screen.findByRole('button', { name: 'Details' });
  expect(screen.getByText('-1')).toBeVisible();
  expect(screen.getByText('Includes replies')).toBeVisible();
  expect(screen.getByText('1,284')).not.toBeVisible();
  details.focus();
  await userEvent.keyboard('{Enter}');
  expect(details).toHaveFocus();
  expect(details).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('1,284')).toBeVisible();
  expect(screen.getByText('Nov 9, 2026 · UTC')).toHaveAttribute('datetime', summary.collectedFrom);
  expect(screen.getByText(/They are not unique readers/)).toBeVisible();
  await userEvent.keyboard(' ');
  expect(details).toHaveAttribute('aria-expanded', 'false');
  expect(mock.history.get).toHaveLength(1);
});

it('shows the author breakdown and draft history without public requests or the public details', async () => {
  signInUser(client, { id: 1, username: 'alice' });
  mock.onGet('/analytics/me/posts/5').reply(200, { ...summary, upvoteCount: 3, downvoteCount: 4 });
  mock.onGet(TREND_URL).reply(200, trend);
  mount({ ...post, status: 'DRAFT' });
  expect(await screen.findByText('3 upvotes · 4 downvotes')).toBeVisible();
  expect(screen.getByRole('region', { name: 'Author insights' })).toBeVisible();
  expect(screen.getByText('1,284')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument();
  expect(mock.history.get.map((r) => r.url).sort()).toEqual(['/analytics/me/posts/5', TREND_URL]);
});

it.each(['USER', 'ADMIN', 'MODERATOR'])(
  'shows only the public endpoint to a different %s account',
  async (role) => {
    signInUser(client, { id: 2, username: 'bob', role });
    mock.onGet('/analytics/public/posts/5').reply(200, summary);
    mount();
    await screen.findByRole('button', { name: 'Details' });
    expect(screen.queryByText(/upvotes/)).not.toBeInTheDocument();
    expect(mock.history.get.map((r) => r.url)).toEqual(['/analytics/public/posts/5']);
  }
);

it.each([
  [1, 0, '1 upvote · 0 downvotes'],
  [0, 1, '0 upvotes · 1 downvote'],
] as const)(
  'labels single votes without changing their counts (%i/%i)',
  async (upvoteCount, downvoteCount, text) => {
    signInUser(client, { id: 1, username: 'alice' });
    mock.onGet('/analytics/me/posts/5').reply(200, {
      ...summary,
      voteScore: upvoteCount - downvoteCount,
      upvoteCount,
      downvoteCount,
    });
    mount();
    expect(await screen.findByText(text)).toBeVisible();
  }
);

it.each(['DRAFT', 'DELETED'] as const)(
  'requests no insights for another account viewing a %s',
  async (status) => {
    signInUser(client, { id: 2, username: 'staff', role: 'ADMIN' });
    const { container } = mount({ ...post, status });
    expect(container).toBeEmptyDOMElement();
    expect(mock.history.get).toHaveLength(0);
  }
);

it('does not call a zero score a lack of votes or invent activity', async () => {
  mock
    .onGet('/analytics/public/posts/5')
    .reply(200, { ...summary, voteScore: 0, commentCount: 0, viewCount: 0 });
  mount();
  await userEvent.click(await screen.findByRole('button', { name: 'Details' }));
  expect(screen.getAllByText('0')).toHaveLength(3);
  expect(screen.queryByText(/No activity|No votes/i)).not.toBeInTheDocument();
});

it.each([500, 403, 404, 429, 401])(
  'represents %i without rendering internal server text',
  async (status) => {
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    client.setQueryData(getPublicSummaryQueryKey(5), summary);
    mock
      .onGet('/analytics/public/posts/5')
      .reply(status, { detail: 'PSQLException: secret SQL at backend.internal' });
    mount();
    const error = await screen.findByRole('alert');
    expect(error).not.toHaveTextContent(/PSQL|secret|backend.internal/);
    expect(screen.queryByText('-1')).not.toBeInTheDocument();
    if (status === 404)
      await waitFor(() =>
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['/forum/posts/hello'] })
      );
  }
);

it('keeps retry mounted, reports another failure and restores focus after successful recovery', async () => {
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
  await waitFor(() => expect(screen.getByRole('button', { name: 'Details' })).toHaveFocus());
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(refreshPost).toHaveBeenCalledTimes(2);
});

it('refreshes both resources once, retains expansion, and reports a failed article read', async () => {
  mock.onGet('/analytics/public/posts/5').replyOnce(200, summary);
  mock.onGet('/analytics/public/posts/5').reply(200, { ...summary, voteScore: 8 });
  mount();
  await userEvent.click(await screen.findByRole('button', { name: 'Details' }));
  let finish!: (value: { isError: boolean }) => void;
  refreshPost.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  await userEvent.dblClick(screen.getByRole('button', { name: 'Refresh insights' }));
  expect(refreshPost).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute(
    'aria-expanded',
    'true'
  );
  await act(async () => {
    finish({ isError: true });
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('The post could not be refreshed');
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('8')).toBeVisible();
  expect(screen.getByText('1,284')).toBeVisible();
  expect(mock.history.post).toHaveLength(0);
});

it('does not steal focus when the reader leaves the card during recovery', async () => {
  mock.onGet('/analytics/public/posts/5').replyOnce(500);
  let finish!: (value: [number, typeof summary]) => void;
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
  expect(outside).toHaveFocus();
  outside.remove();
});

it('hides owner values immediately on account replacement even when their cache remains', async () => {
  signInUser(client, { id: 1, username: 'alice' });
  mock.onGet('/analytics/me/posts/5').reply(200, { ...summary, upvoteCount: 3, downvoteCount: 4 });
  mock.onGet('/analytics/public/posts/5').reply(200, summary);
  mount();
  await screen.findByText('3 upvotes · 4 downvotes');
  await act(async () => {
    signInUser(client, { id: 2, username: 'bob' });
  });
  await waitFor(() => expect(screen.queryByText(/3 upvotes/)).not.toBeInTheDocument());
  await screen.findByRole('region', { name: 'Post insights' });
});

it('resets expansion and does not carry totals across post navigation', async () => {
  mock.onGet('/analytics/public/posts/5').reply(200, summary);
  mock.onGet('/analytics/public/posts/6').reply(200, { ...summary, postId: 6, voteScore: 19 });
  const view = mount();
  await userEvent.click(await screen.findByRole('button', { name: 'Details' }));
  view.rerender(
    <QueryClientProvider client={client}>
      <PostInsights post={{ ...post, id: 6 }} onRefreshPost={refreshPost} />
    </QueryClientProvider>
  );
  expect(screen.queryByText('-1')).not.toBeInTheDocument();
  expect(await screen.findByText('19')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Details' })).toHaveAttribute('aria-expanded', 'false');
  expect(within(screen.getByRole('region')).getByText('1,284')).not.toBeVisible();
});

describe('author daily opening trend', () => {
  function ownerMount() {
    signInUser(client, { id: 1, username: 'alice' });
    mock
      .onGet('/analytics/me/posts/5')
      .reply(200, { ...summary, upvoteCount: 3, downvoteCount: 4 });
    return mount();
  }

  it('shows each day in the graph and in a table, a zero apart from a day before collection', async () => {
    mock.onGet(TREND_URL).reply(200, trend);
    ownerMount();

    expect(await screen.findByRole('heading', { name: 'Daily openings' })).toBeVisible();
    expect(
      screen.getByText(
        'Nov 5–11, 2026 · UTC · daily openings. Today is partial, counted up to 14:30 UTC.'
      )
    ).toBeVisible();
    expect(screen.getByRole('img')).toHaveAccessibleName(
      /Openings per day, Last 7 days, UTC\. Nov 5, 2026: not measured.*Nov 9, 2026: 0 openings.*Nov 11, 2026 \(today, partial\): 4 openings$/
    );
    expect(mock.history.get.find((r) => r.url === TREND_URL)?.params).toEqual({ period: '7d' });

    await userEvent.click(screen.getByRole('button', { name: 'Data table' }));
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getByRole('cell').textContent)).toEqual([
      'Not measured',
      'Not measured',
      'Not measured',
      '4',
      '0',
      '8',
      '4',
    ]);
    expect(within(rows[6]).getByRole('rowheader')).toHaveTextContent(
      'Nov 11, 2026 (today, partial)'
    );
  });

  it('says why the early days have no value and that they are not zero', async () => {
    mock.onGet(TREND_URL).reply(200, trend);
    ownerMount();

    const note = await screen.findByText(
      'Openings were not collected before Nov 8, 2026 UTC. Those days are not zero.'
    );
    expect(note).toBeVisible();
    expect(screen.getByText('Not measured', { selector: 'p' })).toBeVisible();
  });

  it('shows measured zeros as zeros, not as missing', async () => {
    mock.onGet(TREND_URL).reply(200, {
      ...trend,
      days: trend.days.map((day) => ({ ...day, measured: true, openings: 0 })),
    });
    ownerMount();

    expect(await screen.findByText('No openings recorded in this period.')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Data table' }));
    expect(screen.queryByText('Not measured', { selector: 'span' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('cell', { name: '0' })).toHaveLength(7);
  });

  it('changes the window by click and by keyboard, and never shows the old days under the new one', async () => {
    mock.onGet(TREND_URL, { params: { period: '7d' } }).reply(200, trend);
    mock.onGet(TREND_URL, { params: { period: '30d' } }).reply(200, trend30);
    ownerMount();
    await screen.findByRole('heading', { name: 'Daily openings' });
    const user = userEvent.setup();

    expect(screen.getByRole('radio', { name: '7 days' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: '30 days' }));

    expect(await screen.findByRole('img', { name: /Last 30 days/ })).toHaveAccessibleName(
      /Nov 10, 2026: 7 openings, Nov 11, 2026 \(today, partial\): 2 openings$/
    );
    expect(screen.getByRole('radio', { name: '30 days' })).toBeChecked();
    expect(mock.history.get.filter((r) => r.url === TREND_URL).map((r) => r.params.period)).toEqual(
      ['7d', '30d']
    );

    screen.getByRole('radio', { name: '30 days' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(await screen.findByRole('img', { name: /Last 7 days/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '7 days' })).toHaveFocus();
  });

  it('announces the loading of a window and keeps the totals on screen', async () => {
    mock.onGet(TREND_URL).reply(() => new Promise(() => {}));
    ownerMount();

    expect(await screen.findByText('3 upvotes · 4 downvotes')).toBeVisible();
    expect(screen.getByRole('status', { name: 'Loading chart' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows a fixed message with a retry for a failed series, keeps the totals, and recovers', async () => {
    mock.onGet(TREND_URL).replyOnce(500, { detail: 'PSQLException at db:5432' });
    mock.onGet(TREND_URL).reply(200, trend);
    ownerMount();

    expect(await screen.findByText('3 upvotes · 4 downvotes')).toBeVisible();
    const alert = await screen.findByText('Insights could not be loaded. Please try again.');
    expect(document.body).not.toHaveTextContent('PSQLException');
    expect(screen.getByText('1,284')).toBeVisible();

    await userEvent.click(
      within(alert.closest('[role="alert"]') as HTMLElement).getByRole('button', {
        name: 'Try again',
      })
    );

    expect(await screen.findByRole('img')).toBeInTheDocument();
    expect(screen.getByText('3 upvotes · 4 downvotes')).toBeVisible();
  });

  it.each([
    [404, 'These insights are no longer available. The post may have changed.'],
    [403, 'These insights are not available to your account.'],
  ])('words a %i answer for the series as the totals do', async (status, text) => {
    mock.onGet(TREND_URL).reply(status);
    ownerMount();

    expect(await screen.findByText(text)).toBeVisible();
  });

  it('reads the series again with Refresh insights, and says so if that read fails', async () => {
    mock.onGet(TREND_URL).replyOnce(200, trend);
    mock.onGet(TREND_URL).reply(500);
    ownerMount();
    await screen.findByRole('img');

    await userEvent.click(screen.getByRole('button', { name: 'Refresh insights' }));

    expect(
      await screen.findByText(
        'The daily openings could not be refreshed. What you see may be out of date.'
      )
    ).toBeVisible();
    // The days stay, and so do the totals: a failed refresh does not turn them into a failure.
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('3 upvotes · 4 downvotes')).toBeVisible();
    expect(mock.history.get.filter((r) => r.url === TREND_URL)).toHaveLength(2);
  });

  it('asks for no series and shows none to the public or to another account', async () => {
    mock.onGet('/analytics/public/posts/5').reply(200, summary);
    signInUser(client, { id: 2, username: 'bob' });
    mount();

    await screen.findByRole('button', { name: 'Details' });
    expect(screen.queryByRole('heading', { name: 'Daily openings' })).not.toBeInTheDocument();
    expect(mock.history.get.some((r) => r.url === TREND_URL)).toBe(false);
  });

  it('hides the series immediately when another account takes over, even if its copy is cached', async () => {
    mock.onGet(TREND_URL).reply(200, trend);
    mock.onGet('/analytics/public/posts/5').reply(200, summary);
    ownerMount();
    await screen.findByRole('img');

    await act(async () => {
      signInUser(client, { id: 2, username: 'bob' });
    });

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Daily openings' })).not.toBeInTheDocument()
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await screen.findByRole('region', { name: 'Post insights' });
  });
});
