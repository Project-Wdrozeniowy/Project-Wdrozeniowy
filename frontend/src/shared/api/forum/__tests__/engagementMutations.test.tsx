import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { apiClient } from '@/shared/api/client/api';
import { authorEngagementKey } from '@/shared/api/analytics/postEngagement';
import { usePostEngagement } from '@/shared/api/analytics/usePostEngagement';
import { getPublicSummaryQueryKey } from '@/shared/api/generated/orbita.api';
import { useComments } from '@/shared/api/forum/useComments';
import { useVotePost } from '@/shared/api/forum/useVotePost';

const initial = {
  postId: 5,
  viewCount: 2,
  commentCount: 0,
  voteScore: 0,
  collectedFrom: '2026-11-01T00:00:00Z',
  upvoteCount: 0,
  downvoteCount: 0,
};
let mock: MockAdapter;
let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mock = new MockAdapter((apiClient as unknown as { client: AxiosInstance }).client);
  apiClient.clearCsrf();
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  mock.onGet('/forum/posts/hello/comments').reply(200, { content: [], page: 0, last: true });
  mock.onGet('/analytics/me/posts/5').replyOnce(200, initial);
  client.setQueryData(getPublicSummaryQueryKey(5), initial);
  client.setQueryData(getPublicSummaryQueryKey(6), initial);
});
afterEach(() => {
  client.clear();
  mock.restore();
});

it.each(['UP', 'DOWN', 'retract'] as const)(
  'refetches actual author counts after %s without touching other posts',
  async (action) => {
    const after = {
      ...initial,
      voteScore: action === 'DOWN' ? -1 : action === 'UP' ? 1 : 0,
      upvoteCount: action === 'UP' ? 1 : 0,
      downvoteCount: action === 'DOWN' ? 1 : 0,
    };
    mock.onGet('/analytics/me/posts/5').reply(200, after);
    mock.onPost('/forum/votes').reply(201, { id: 10, voteType: action, newScore: after.voteScore });
    mock.onDelete('/forum/votes/10').reply(204);
    const { result } = renderHook(
      () => ({ vote: useVotePost(5), summary: usePostEngagement(5, 1) }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.summary.isSuccess).toBe(true));
    await act(async () => {
      await result.current.vote.mutateAsync({
        clicked: action === 'retract' ? 'UP' : action,
        voteScore: action === 'retract' ? 1 : 0,
        myVote: action === 'retract' ? { id: 10, voteType: 'UP' } : null,
      });
    });
    await waitFor(() => expect(result.current.summary.data).toEqual(after));
    expect(client.getQueryState(getPublicSummaryQueryKey(5))?.isInvalidated).toBe(true);
    expect(client.getQueryState(getPublicSummaryQueryKey(6))?.isInvalidated).toBe(false);
  }
);

it.each(['root', 'reply', 'delete'] as const)(
  'refreshes the summary after a persisted %s comment change',
  async (action) => {
    mock
      .onGet('/analytics/me/posts/5')
      .reply(200, { ...initial, commentCount: action === 'delete' ? 0 : 1 });
    mock.onPost('/forum/posts/hello/comments').reply(201, { id: 9, content: 'Reply' });
    mock.onDelete('/forum/comments/9').reply(204);
    const { result } = renderHook(
      () => ({ comments: useComments('hello', 5), summary: usePostEngagement(5, 1) }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.summary.isSuccess).toBe(true));
    await act(async () => {
      if (action === 'delete') await result.current.comments.deleteComment.mutateAsync(9);
      else
        await result.current.comments.addComment.mutateAsync({
          content: 'Reply',
          parentId: action === 'reply' ? 8 : undefined,
        });
    });
    await waitFor(() =>
      expect(mock.history.get.filter((r) => r.url === '/analytics/me/posts/5')).toHaveLength(2)
    );
    expect(result.current.summary.data?.commentCount).toBe(action === 'delete' ? 0 : 1);
    if (action === 'reply')
      expect(JSON.parse(mock.history.post[0].data)).toEqual({ content: 'Reply', parentId: 8 });
  }
);

it('does not turn an accepted comment into a failed mutation when statistics refetch fails', async () => {
  mock.onGet('/analytics/me/posts/5').reply(500);
  mock.onPost('/forum/posts/hello/comments').reply(201, { id: 9, content: 'Accepted' });
  const { result } = renderHook(
    () => ({ comments: useComments('hello', 5), summary: usePostEngagement(5, 1) }),
    { wrapper }
  );
  await waitFor(() => expect(result.current.summary.isSuccess).toBe(true));
  await act(async () => {
    await result.current.comments.addComment.mutateAsync({ content: 'Accepted' });
  });
  await waitFor(() => expect(result.current.summary.isError).toBe(true));
  expect(result.current.comments.addComment.isSuccess).toBe(true);
  expect(mock.history.post).toHaveLength(1);
});

it('does not invalidate statistics as a successful vote when the server rejects it', async () => {
  client.setQueryData(authorEngagementKey(5, 1), initial);
  mock.onPost('/forum/votes').reply(403);
  const { result } = renderHook(() => useVotePost(5), { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ clicked: 'UP', voteScore: 0, myVote: null }).catch(() => {});
  });
  expect(client.getQueryState(authorEngagementKey(5, 1))?.isInvalidated).toBe(false);
  expect(client.getQueryState(getPublicSummaryQueryKey(5))?.isInvalidated).toBe(false);
});
