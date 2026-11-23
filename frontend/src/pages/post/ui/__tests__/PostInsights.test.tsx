import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import PostInsights from '../PostInsights';
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

it('shows the author breakdown and draft history without public requests or trend controls', async () => {
  signInUser(client, { id: 1, username: 'alice' });
  mock.onGet('/analytics/me/posts/5').reply(200, { ...summary, upvoteCount: 3, downvoteCount: 4 });
  mount({ ...post, status: 'DRAFT' });
  expect(await screen.findByText('3 upvotes · 4 downvotes')).toBeVisible();
  expect(screen.getByRole('region', { name: 'Author insights' })).toBeVisible();
  expect(screen.getByText('1,284')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument();
  expect(mock.history.get.map((r) => r.url)).toEqual(['/analytics/me/posts/5']);
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
