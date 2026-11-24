import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useEditPost } from '../useEditPost';
import { orvalTransport } from '@/shared/api/client/orvalTransport';
import {
  getGetPostQueryKey,
  getListPostsQueryKey,
  getSearchQueryKey,
  getGetTrendingPostsQueryKey,
} from '@/shared/api/generated/orbita.api';
import type { PostDto } from '@/shared/api/generated/models/postDto.dto';
import { AUTHOR_POSTS_QUERY_KEY } from '../authorPosts.const';
import { signInUser } from '@/test/session';
import { sessionEvents } from '@/shared/auth/sessionEvents';

vi.mock('@/shared/api/client/orvalTransport', () => ({ orvalTransport: vi.fn() }));
const post = {
  id: 5,
  slug: 'hello',
  title: 'Old',
  content: 'Body',
  author: { id: 1 },
  voteScore: 7,
  viewCount: 9,
  commentCount: 2,
} as PostDto;
let client: QueryClient;
const detail = getGetPostQueryKey(post.slug);
const feed = getListPostsQueryKey({ page: 0 });
const search = getSearchQueryKey({ q: 'Old' });
const trending = getGetTrendingPostsQueryKey({ period: '7d' });
const author = [...AUTHOR_POSTS_QUERY_KEY, 'alice'];
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  signInUser(client, { id: 1 });
  vi.mocked(orvalTransport).mockResolvedValue({
    ...post,
    title: 'New',
    voteScore: 1,
    viewCount: 1,
    commentCount: 0,
  });
});
afterEach(() => {
  client.clear();
  vi.clearAllMocks();
});

it('cancels an older detail GET before writing saved text', async () => {
  client.setQueryData(detail, post);
  let old!: (value: PostDto) => void;
  const pendingRead = client
    .fetchQuery({
      queryKey: detail,
      queryFn: () =>
        new Promise<PostDto>((resolve) => {
          old = resolve;
        }),
    })
    .catch(() => undefined);
  const { result } = renderHook(() => useEditPost(post), { wrapper });
  client.setQueryData(detail, { ...post, voteScore: 8 });
  await act(async () => {
    await result.current.mutateAsync({ slug: post.slug, data: { title: 'New' } });
  });
  old(post);
  await pendingRead;
  expect(client.getQueryData(detail)).toMatchObject({ title: 'New', voteScore: 8 });
});

it('rechecks the session after asynchronous read cancellation', async () => {
  client.setQueryData(detail, post);
  const cancel = vi.spyOn(client, 'cancelQueries').mockImplementationOnce(async () => {
    sessionEvents.advance();
  });
  const { result } = renderHook(() => useEditPost(post), { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ slug: post.slug, data: { title: 'New' } });
  });
  expect(client.getQueryData(detail)).toMatchObject({ title: 'Old' });
  cancel.mockRestore();
});

it('does not create uncached private detail or touch unrelated posts and null search sections', async () => {
  client.setQueryData(feed, { content: [{ ...post, id: 8, title: 'Unrelated' }] });
  client.setQueryData(search, { posts: null, users: null, tags: null });
  const { result } = renderHook(() => useEditPost(post), { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ slug: post.slug, data: { title: 'New' } });
  });
  expect(client.getQueryData(detail)).toBeUndefined();
  expect(client.getQueryData(feed)).toMatchObject({ content: [{ title: 'Unrelated' }] });
  expect(client.getQueryData(search)).toMatchObject({ posts: null });
});

it('updates text in every current cache shape without overwriting newer engagement, then invalidates the lists', async () => {
  client.setQueryData(detail, post);
  client.setQueryData(feed, { content: [post] });
  client.setQueryData(search, { query: 'Old', posts: { content: [post] } });
  client.setQueryData(trending, [post]);
  client.setQueryData(author, { pages: [{ content: [post] }], pageParams: [0] });
  const { result } = renderHook(() => useEditPost(post), { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ slug: post.slug, data: { title: 'New' } });
  });
  expect(client.getQueryData(detail)).toMatchObject({
    title: 'New',
    voteScore: 7,
    viewCount: 9,
    commentCount: 2,
  });
  expect(client.getQueryData(feed)).toMatchObject({ content: [{ title: 'New', voteScore: 7 }] });
  expect(client.getQueryData(search)).toMatchObject({ posts: { content: [{ title: 'New' }] } });
  expect(client.getQueryData(trending)).toMatchObject([{ title: 'New' }]);
  expect(client.getQueryData(author)).toMatchObject({ pages: [{ content: [{ title: 'New' }] }] });
  for (const key of [detail, feed, search, trending, author])
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
});

it('does not write an old account response into a replacement account cache', async () => {
  let finish!: (post: PostDto) => void;
  vi.mocked(orvalTransport).mockReturnValue(
    new Promise<PostDto>((resolve) => {
      finish = resolve;
    })
  );
  const { result } = renderHook(() => useEditPost(post), { wrapper });
  let pending!: Promise<PostDto>;
  await act(async () => {
    pending = result.current.mutateAsync({ slug: post.slug, data: { title: 'New' } });
  });
  signInUser(client, { id: 2 });
  client.setQueryData(detail, post);
  await act(async () => {
    finish({ ...post, title: 'New' });
    await pending;
  });
  expect(client.getQueryData(detail)).toMatchObject({ title: 'Old' });
});
