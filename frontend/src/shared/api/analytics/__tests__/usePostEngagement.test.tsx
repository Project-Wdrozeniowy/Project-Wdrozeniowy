import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { apiClient } from '@/shared/api/client/api';
import { getPublicSummaryQueryKey } from '@/shared/api/generated/orbita.api';
import { authorEngagementKey, invalidatePostEngagement } from '../postEngagement';
import { usePostEngagement } from '../usePostEngagement';

const summary = {
  postId: 5,
  viewCount: 2,
  commentCount: 1,
  voteScore: -1,
  collectedFrom: '2026-11-01T00:00:00Z',
};
let client: QueryClient;
let mock: MockAdapter;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mock = new MockAdapter((apiClient as unknown as { client: AxiosInstance }).client);
});
afterEach(() => {
  client.clear();
  mock.restore();
});

it('reads only public fields for a public viewer through the generated transport', async () => {
  mock.onGet('/analytics/public/posts/5').reply(200, summary);
  const { result } = renderHook(() => usePostEngagement(5), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(summary);
  expect(mock.history.get.map((r) => r.url)).toEqual(['/analytics/public/posts/5']);
});

it('reads the owner summary under a post/account key without also requesting public data', async () => {
  const owner = { ...summary, upvoteCount: 1, downvoteCount: 2 };
  mock.onGet('/analytics/me/posts/5').reply(200, owner);
  const { result } = renderHook(() => usePostEngagement(5, 7), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(client.getQueryData(authorEngagementKey(5, 7))).toEqual(owner);
  expect(client.getQueryData(authorEngagementKey(5, 8))).toBeUndefined();
  expect(mock.history.get.map((r) => r.url)).toEqual(['/analytics/me/posts/5']);
});

it('marks only this post stale, including inactive owner copies, without fetching inactive queries', async () => {
  const publicKey = getPublicSummaryQueryKey(5);
  const ownerKey = authorEngagementKey(5, 7);
  const otherKey = getPublicSummaryQueryKey(6);
  for (const key of [publicKey, ownerKey, otherKey]) client.setQueryData(key, summary);
  await invalidatePostEngagement(client, 5);
  expect(client.getQueryState(publicKey)?.isInvalidated).toBe(true);
  expect(client.getQueryState(ownerKey)?.isInvalidated).toBe(true);
  expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false);
  expect(mock.history.get).toHaveLength(0);
});

it('cancels an initial snapshot overtaken by a mutation and uses the new summary', async () => {
  let finish!: (value: [number, typeof summary]) => void;
  mock.onGet('/analytics/public/posts/5').replyOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  mock.onGet('/analytics/public/posts/5').reply(200, { ...summary, voteScore: 1 });
  const { result } = renderHook(() => usePostEngagement(5), { wrapper });
  await waitFor(() => expect(mock.history.get).toHaveLength(1));
  await act(async () => {
    await invalidatePostEngagement(client, 5);
  });
  await waitFor(() => expect(result.current.data?.voteScore).toBe(1));
  await act(async () => {
    finish([200, summary]);
  });
  expect(result.current.data?.voteScore).toBe(1);
});
