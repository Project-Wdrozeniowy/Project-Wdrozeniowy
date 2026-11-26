import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { AxiosInstance } from 'axios';
import { useEffect } from 'react';
import MockAdapter from 'axios-mock-adapter';
import AuthProvider from '@/app/providers/AuthProvider';
import QueryProvider from '@/app/providers/QueryProvider';
import PostInsights from '@/pages/post/ui/PostInsights';
import { apiClient } from '@/shared/api/client/api';
import type { PostDto } from '@/shared/api/generated/models/postDto.dto';
import { authorEngagementKey } from '@/shared/api/analytics/postEngagement';
import { reconcileSession, signOutSession } from '@/shared/auth/session';
import { useStore } from '@/store';

vi.mock('@tanstack/react-query-devtools', () => ({ ReactQueryDevtools: () => null }));
const post = { id: 5, slug: 'hello', status: 'PUBLISHED', author: { id: 1 } } as PostDto;
const summary = {
  postId: 5,
  viewCount: 2,
  commentCount: 1,
  voteScore: 2,
  collectedFrom: '2026-11-01T00:00:00Z',
  upvoteCount: 3,
  downvoteCount: 1,
};
let http: MockAdapter;
let client: QueryClient;
function Capture() {
  const queryClient = useQueryClient();
  useEffect(() => {
    client = queryClient;
  }, [queryClient]);
  return <PostInsights post={post} onRefreshPost={async () => ({ isError: false })} />;
}
function mount() {
  return render(
    <QueryProvider>
      <AuthProvider>
        <Capture />
      </AuthProvider>
    </QueryProvider>
  );
}
beforeEach(() => {
  vi.stubGlobal('BroadcastChannel', undefined);
  useStore.getState().logout();
  apiClient.clearCsrf();
  http = new MockAdapter((apiClient as unknown as { client: AxiosInstance }).client);
  http.onGet('/users/me').reply(200, { id: 1, username: 'alice' });
  http.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  http.onPost('/auth/logout').reply(204);
  http.onGet('/analytics/me/posts/5/openings').reply(200, {
    postId: 5,
    period: '7d',
    totalOpenings: 2,
    collectedFrom: summary.collectedFrom,
    windowStart: '2026-11-01T00:00:00Z',
    windowEnd: '2026-11-08T00:00:00Z',
    generatedAt: '2026-11-07T12:00:00Z',
    days: [{ date: '2026-11-07', measured: true, openings: 2 }],
  });
  http.onGet('/analytics/public/posts/5').reply(200, {
    postId: 5,
    viewCount: 2,
    commentCount: 1,
    voteScore: 2,
    collectedFrom: summary.collectedFrom,
  });
});
afterEach(() => {
  cleanup();
  client?.clear();
  http.restore();
  vi.unstubAllGlobals();
});

it('clears private counts on real session logout and drops a late author response', async () => {
  let finish!: (value: [number, typeof summary]) => void;
  http.onGet('/analytics/me/posts/5').reply(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  mount();
  await waitFor(() =>
    expect(http.history.get.some((r) => r.url === '/analytics/me/posts/5')).toBe(true)
  );
  await act(async () => {
    await signOutSession();
  });
  await screen.findByRole('region', { name: 'Post insights' });
  await act(async () => {
    finish([200, summary]);
  });
  expect(screen.queryByText(/3 upvotes/)).not.toBeInTheDocument();
  expect(client.getQueryData(authorEngagementKey(5, 1))).toBeUndefined();
});

it('keeps counts on a focus check of the same account, then clears them when another account takes over', async () => {
  http.onGet('/analytics/me/posts/5').reply(200, summary);
  mount();
  await screen.findByText('3 upvotes · 1 downvote');
  await act(async () => {
    await reconcileSession(true);
  });
  expect(screen.getByText('3 upvotes · 1 downvote')).toBeVisible();
  http.onGet('/users/me').reply(200, { id: 2, username: 'bob' });
  await act(async () => {
    await reconcileSession(true);
  });
  await screen.findByRole('region', { name: 'Post insights' });
  expect(screen.queryByText(/3 upvotes/)).not.toBeInTheDocument();
  expect(client.getQueryData(authorEngagementKey(5, 1))).toBeUndefined();
});

it('honors an expired real author read through the transport unauthorized handler', async () => {
  http.onGet('/analytics/me/posts/5').reply(401);
  mount();
  await screen.findByRole('region', { name: 'Post insights' });
  await waitFor(() => expect(useStore.getState().sessionStatus).toBe('guest'));
  expect(screen.queryByText(/upvotes/)).not.toBeInTheDocument();
  expect(client.getQueryData(authorEngagementKey(5, 1))).toBeUndefined();
});
