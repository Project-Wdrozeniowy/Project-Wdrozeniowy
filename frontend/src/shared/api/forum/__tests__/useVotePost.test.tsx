import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { useVotePost } from '@/shared/api/forum/useVotePost';
import { apiClient } from '@/shared/api/client/api';
import { AUTHOR_POSTS_QUERY_KEY } from '@/shared/api/forum/authorPosts.const';
import { getGetPostQueryKey, getListPostsQueryKey } from '@/shared/api/generated/orbita.api';
import type { PostDto } from '@/shared/api/generated/models/postDto.dto';

vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;
let client: QueryClient;

const POST = { id: 5, slug: 'hello', voteScore: 3, myVote: null, content: 'text' } as PostDto;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => mock.restore());

describe('a vote and the post page', () => {
  it('updates the cached post of the post page, wherever the vote is made', async () => {
    client.setQueryData(getGetPostQueryKey('hello'), POST);
    client.setQueryData(getGetPostQueryKey('other'), {
      ...POST,
      id: 6,
      slug: 'other',
      voteScore: 9,
    });
    mock.onPost('/forum/votes').reply(201, {
      id: 9,
      entityType: 'POST',
      entityId: 5,
      voteType: 'UP',
      newScore: 4,
    });
    const { result } = renderHook(() => useVotePost(5), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ clicked: 'UP', voteScore: 3, myVote: null });
    });

    expect(client.getQueryData<PostDto>(getGetPostQueryKey('hello'))).toMatchObject({
      voteScore: 4,
      myVote: { id: 9, voteType: 'UP' },
    });
    // Another post is left alone.
    expect(client.getQueryData<PostDto>(getGetPostQueryKey('other'))?.voteScore).toBe(9);
  });

  it('does not invent a post that is not cached', async () => {
    mock.onPost('/forum/votes').reply(201, {
      id: 9,
      entityType: 'POST',
      entityId: 5,
      voteType: 'UP',
      newScore: 4,
    });
    const { result } = renderHook(() => useVotePost(5), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ clicked: 'UP', voteScore: 3, myVote: null });
    });

    expect(client.getQueryData(getGetPostQueryKey('hello'))).toBeUndefined();
  });

  it('takes the vote back on the cached post, and has it confirmed by a reload', async () => {
    client.setQueryData(getGetPostQueryKey('hello'), {
      ...POST,
      voteScore: 4,
      myVote: { id: 9, voteType: 'UP' },
    });
    client.setQueryData(getListPostsQueryKey({ page: 0 }), { content: [] });
    mock.onDelete('/forum/votes/9').reply(204);
    const { result } = renderHook(() => useVotePost(5), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        clicked: 'UP',
        voteScore: 4,
        myVote: { id: 9, voteType: 'UP' },
      });
    });

    await waitFor(() =>
      expect(client.getQueryState(getGetPostQueryKey('hello'))?.isInvalidated).toBe(true)
    );
    expect(client.getQueryData<PostDto>(getGetPostQueryKey('hello'))).toMatchObject({
      voteScore: 3,
      myVote: null,
    });
  });

  it('reloads the cached post when the server says the post or the vote changed', async () => {
    client.setQueryData(getGetPostQueryKey('hello'), POST);
    mock.onPost('/forum/votes').reply(409, { status: 409 });
    const { result } = renderHook(() => useVotePost(5), { wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({ clicked: 'UP', voteScore: 3, myVote: null })
        .catch(() => {});
    });

    await waitFor(() =>
      expect(client.getQueryState(getGetPostQueryKey('hello'))?.isInvalidated).toBe(true)
    );
  });

  it("updates the post in the profile's list of one author, which is loaded page by page", async () => {
    const key = [...AUTHOR_POSTS_QUERY_KEY, 'alice'];
    client.setQueryData(key, {
      pages: [
        {
          content: [
            { id: 5, voteScore: 3, myVote: null },
            { id: 6, voteScore: 1, myVote: null },
          ],
        },
      ],
      pageParams: [0],
    });
    mock.onPost('/forum/votes').reply(201, {
      id: 9,
      entityType: 'POST',
      entityId: 5,
      voteType: 'UP',
      newScore: 4,
    });
    const { result } = renderHook(() => useVotePost(5), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ clicked: 'UP', voteScore: 3, myVote: null });
    });

    const data = client.getQueryData<{ pages: { content: { id: number; voteScore: number }[] }[] }>(
      key
    );
    expect(data?.pages[0].content.map((p) => p.voteScore)).toEqual([4, 1]);
  });

  it("has the profile's list confirmed by a reload after a retract", async () => {
    const key = [...AUTHOR_POSTS_QUERY_KEY, 'alice'];
    client.setQueryData(key, {
      pages: [{ content: [{ id: 5, voteScore: 4, myVote: { id: 9, voteType: 'UP' } }] }],
      pageParams: [0],
    });
    mock.onDelete('/forum/votes/9').reply(204);
    const { result } = renderHook(() => useVotePost(5), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        clicked: 'UP',
        voteScore: 4,
        myVote: { id: 9, voteType: 'UP' },
      });
    });

    await waitFor(() => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
  });
});
