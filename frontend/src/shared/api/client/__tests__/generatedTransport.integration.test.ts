import type * as Operations from '@/shared/api/generated/orbita.api';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { QueryClient } from '@tanstack/react-query';
import type { NotificationDto } from '@/shared/api/generated/models/notificationDto.dto';
import type { PagedResponseNotificationDto } from '@/shared/api/generated/models/pagedResponseNotificationDto.dto';
import type { UserActivitySummaryDto } from '@/shared/api/generated/models/userActivitySummaryDto.dto';
import type { PostAnalyticsDto } from '@/shared/api/generated/models/postAnalyticsDto.dto';
import type { PlatformSummaryDto } from '@/shared/api/generated/models/platformSummaryDto.dto';

const toastError = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: toastError },
}));

let mock: MockAdapter;
let operations: typeof Operations;

beforeEach(async () => {
  vi.resetModules();
  toastError.mockClear();
  const { apiClient } = await import('../api');
  mock = new MockAdapter((apiClient as unknown as { client: AxiosInstance }).client);
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  operations = await import('@/shared/api/generated/orbita.api');
});
afterEach(() => mock.restore());

it('preserves a profile 401 after successful login instead of treating it as a superseded mutation', async () => {
  const { authenticateSession, observeSessionChanges } = await import('@/shared/auth/session');
  const { useStore } = await import('@/store');
  vi.stubGlobal('BroadcastChannel', undefined);
  useStore.getState().logout();
  mock.onPost('/auth/login').reply(204);
  mock.onGet('/users/me').reply(401, { detail: 'Authentication failed' });
  const stop = observeSessionChanges();
  try {
    await expect(
      authenticateSession((signal) =>
        operations.login({ username: 'alice', password: 'password123' }, { signal })
      )
    ).rejects.toMatchObject({ response: { status: 401 } });
    expect(mock.history.post.filter((request) => request.url === '/auth/login')).toHaveLength(1);
    expect(useStore.getState().sessionStatus).toBe('error');
    expect(useStore.getState().user).toBeNull();
  } finally {
    stop();
    vi.unstubAllGlobals();
  }
});

it('starts generated search queries only after initial guest bootstrap and caches the successful response', async () => {
  const { createElement, useEffect } = await import('react');
  const { render, waitFor, cleanup } = await import('@testing-library/react/pure');
  const { default: AuthProvider } = await import('@/app/providers/AuthProvider');
  const { useStore } = await import('@/store');
  vi.stubGlobal('BroadcastChannel', undefined);
  useStore.getState().logout();
  let finishProfile!: (response: [number, object]) => void;
  mock.onGet('/users/me').reply(
    () =>
      new Promise((resolve) => {
        finishProfile = resolve;
      })
  );
  const results = {
    query: 'alice',
    posts: null,
    tags: null,
    users: {
      content: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    },
  };
  mock.onGet('/search').reply(200, results);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const options = operations.getSearchQueryOptions({ q: 'alice', type: 'USER' });
  function SearchConsumer() {
    useEffect(() => {
      void client.fetchQuery(options);
    }, []);
    return null;
  }
  try {
    render(createElement(AuthProvider, null, createElement(SearchConsumer)));
    await waitFor(() => expect(finishProfile).toBeDefined());
    expect(mock.history.get.filter((request) => request.url === '/search')).toHaveLength(0);
    finishProfile([401, {}]);
    await waitFor(() => expect(client.getQueryData(options.queryKey)).toEqual(results));
    expect(mock.history.get.filter((request) => request.url === '/search')).toHaveLength(1);
    expect(useStore.getState().sessionStatus).toBe('guest');
  } finally {
    cleanup();
    client.clear();
    vi.unstubAllGlobals();
  }
});

it('keeps a public search result usable when a concurrent focus probe confirms the guest session', async () => {
  const { reconcileSession, observeSessionChanges } = await import('@/shared/auth/session');
  const { useStore } = await import('@/store');
  const { sessionEvents } = await import('@/shared/auth/sessionEvents');
  vi.stubGlobal('BroadcastChannel', undefined);
  useStore.getState().logout();
  let finishProfile!: (response: [number, object]) => void;
  let finishSearch!: (response: [number, object]) => void;
  mock.onGet('/users/me').reply(
    () =>
      new Promise((resolve) => {
        finishProfile = resolve;
      })
  );
  mock.onGet('/search').reply(
    () =>
      new Promise((resolve) => {
        finishSearch = resolve;
      })
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const stop = observeSessionChanges();
  try {
    const bootstrap = reconcileSession(true);
    const generation = sessionEvents.current();
    const options = operations.getSearchQueryOptions({ q: 'alice', type: 'USER' });
    const searching = client.fetchQuery(options);
    await vi.waitFor(() => expect(finishSearch).toBeDefined());
    finishProfile([401, {}]);
    await bootstrap;
    expect(useStore.getState().sessionStatus).toBe('guest');
    expect(sessionEvents.current()).toBe(generation);
    const results = {
      query: 'alice',
      posts: null,
      tags: null,
      users: {
        content: [
          { id: 1, username: 'alice', displayName: null, avatarUrl: null, role: 'USER' as const },
        ],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
      },
    };
    finishSearch([200, results]);
    await expect(searching).resolves.toEqual(results);
    expect(client.getQueryData(options.queryKey)).toEqual(results);
    expect(mock.history.get.filter((request) => request.url === '/search')).toHaveLength(1);
  } finally {
    stop();
    client.clear();
    vi.unstubAllGlobals();
  }
});

it('uses the published notification bindings with session cookies, pagination, nullable fields and empty 204', async () => {
  const notification = {
    id: 9,
    type: 'SYSTEM',
    entityType: null,
    entityId: null,
    senderUsername: null,
    message: null,
    read: false,
    createdAt: '2026-11-05T10:00:00Z',
  } satisfies NotificationDto;
  const page = {
    content: [notification],
    page: 1,
    size: 5,
    totalElements: 6,
    totalPages: 2,
    first: false,
    last: true,
  } satisfies PagedResponseNotificationDto;
  mock.onGet('/notifications').reply((config) => {
    expect(config.headers?.Authorization).toBeUndefined();
    expect(config.withCredentials).toBe(true);
    expect(config.params).toEqual({ unreadOnly: true, page: 1, size: 5 });
    return [200, page];
  });
  await expect(
    operations.listNotifications({ unreadOnly: true, page: 1, size: 5 })
  ).resolves.toMatchObject({ content: [notification], page: 1 });
  mock.onGet('/notifications').reply((config) => {
    expect(config.params).toBeUndefined();
    return [
      200,
      { ...page, content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true },
    ];
  });
  await expect(operations.listNotifications()).resolves.toMatchObject({ page: 0, size: 20 });
  mock.onPatch('/notifications/9/read').reply((config) => {
    expect(config.data).toBeUndefined();
    return [200, { ...notification, read: true }];
  });
  await expect(operations.markRead(9)).resolves.toMatchObject({ id: 9, read: true });
  mock.onPatch('/notifications/read-all').reply(204, '');
  mock.onDelete('/notifications/9').reply(204, '');
  await expect(operations.markAllRead()).resolves.toBeUndefined();
  await expect(operations.deleteNotification(9)).resolves.toBeUndefined();
});

it('reads own activity, per-post analytics and platform summary through generated operations', async () => {
  const activity = {
    userId: 1,
    username: 'alice',
    totalPosts: 0,
    totalComments: 0,
    totalVotesCast: 0,
    totalUpvotesReceived: 0,
    totalDownvotesReceived: 0,
    lastActivityAt: null,
  } satisfies UserActivitySummaryDto;
  const post = {
    postId: 42,
    postTitle: 'Title',
    viewCount: 0,
    uniqueViewCount: 0,
    commentCount: 0,
    voteScore: 0,
    upvoteCount: 0,
    downvoteCount: 0,
    subscriptionCount: 0,
  } satisfies PostAnalyticsDto;
  const platform = {
    totalUsers: 1,
    activeUsers: 1,
    totalPosts: 0,
    totalComments: 0,
    totalVotes: 0,
    totalCategories: 6,
    totalTags: 0,
  } satisfies PlatformSummaryDto;
  mock.onGet('/analytics/me').reply((config) => {
    expect(config.headers?.Authorization).toBeUndefined();
    expect(config.withCredentials).toBe(true);
    return [200, activity];
  });
  mock.onGet('/analytics/posts/42').reply(200, post);
  mock.onGet('/analytics/summary').reply(200, platform);
  await expect(operations.getMyActivitySummary()).resolves.toEqual(activity);
  await expect(operations.getPostAnalytics(42)).resolves.toEqual(post);
  await expect(operations.getPlatformSummary()).resolves.toEqual(platform);
});

it('routes generated analytics parameters and keys through the same transport', async () => {
  const params = { metric: 'posts', period: '7d' } as const;
  const trend = { ...params, total: 0, data: [] };
  mock.onGet('/analytics/trends').reply((config) => {
    expect(config.headers?.Authorization).toBeUndefined();
    expect(config.params).toEqual(params);
    return [200, trend];
  });
  const options = operations.getGetActivityTrendQueryOptions(params);
  const client = new QueryClient();
  try {
    await expect(client.fetchQuery(options)).resolves.toEqual(trend);
    expect(client.getQueryData(operations.getGetActivityTrendQueryKey(params))).toEqual(trend);
  } finally {
    client.clear();
  }
  mock.onGet('/analytics/trending-posts').reply((config) => {
    expect(config.params).toEqual({ period: '24h', limit: 5 });
    return [200, []];
  });
  await expect(operations.getTrendingPosts({ period: '24h', limit: 5 })).resolves.toEqual([]);
  mock.onGet('/analytics/trends').reply((config) => {
    expect(config.params).toBeUndefined();
    return [200, { metric: 'posts', period: '7d', total: 0, data: [] }];
  });
  mock.onGet('/analytics/trending-posts').reply((config) => {
    expect(config.params).toBeUndefined();
    return [200, []];
  });
  await expect(operations.getActivityTrend()).resolves.toMatchObject({
    metric: 'posts',
    period: '7d',
  });
  await expect(operations.getTrendingPosts()).resolves.toEqual([]);
});

it('uses the gateway base, cookies on public reads, encoded paths and generated query parameters', async () => {
  mock.onGet('/forum/posts').reply((config) => {
    expect(config.baseURL).toMatch(/\/api$/);
    expect(config.withCredentials).toBe(true);
    expect(config.headers?.Authorization).toBeUndefined();
    expect(config.params).toEqual({ categoryId: 7, author: 'alice', status: 'PUBLISHED', page: 2 });
    return [200, { content: [], page: 2 }];
  });
  await operations.listPosts({ categoryId: 7, author: 'alice', status: 'PUBLISHED', page: 2 });
  mock.onGet('/forum/posts/a%2Fb%20%3F').reply(200, { slug: 'a/b ?' });
  await expect(operations.getPost('a/b ?')).resolves.toEqual({ slug: 'a/b ?' });
});

it('sends generated auth bodies with CSRF and no token response', async () => {
  mock.onPost('/auth/login').reply((config) => {
    expect(JSON.parse(config.data)).toEqual({ username: 'alice', password: 'Password123' });
    expect(config.headers?.['X-CSRF-TOKEN']).toBe('csrf');
    return [204, ''];
  });
  await expect(
    operations.login({ username: 'alice', password: 'Password123' })
  ).resolves.toBeUndefined();
  mock.onPost('/auth/logout').reply((config) => {
    expect(config.data).toBeUndefined();
    return [204, ''];
  });
  await expect(operations.logout()).resolves.toBeUndefined();
});

it('propagates query cancellation without a global network error toast', async () => {
  let complete!: () => void;
  mock.onGet('/search').reply(
    () =>
      new Promise((resolve) => {
        complete = () => resolve([200, {}]);
      })
  );
  const controller = new AbortController();
  const pending = operations.search({ q: 'react' }, undefined, controller.signal);
  await vi.waitFor(() => expect(complete).toBeTypeOf('function'));
  controller.abort();
  complete();
  await expect(pending).rejects.toMatchObject({ code: 'ERR_CANCELED' });
  expect(mock.history.get[0].signal).toBe(controller.signal);
  expect(toastError).not.toHaveBeenCalled();
});

it('does not refresh after expected invalid credentials on a generated auth operation', async () => {
  mock.onPost('/auth/login').reply(401, { status: 401 });
  await expect(operations.login({ username: 'alice', password: 'wrong' })).rejects.toMatchObject({
    response: { status: 401 },
  });
  expect(mock.history.post.map((request) => request.url)).toEqual(['/auth/login']);
  expect(toastError).not.toHaveBeenCalled();
});

it('invalidates every generated feed key without delaying publish success for refetch', async () => {
  const client = new QueryClient();
  client.setQueryData(operations.getListPostsQueryKey({ page: 0 }), { content: [] });
  client.setQueryData(operations.getListPostsQueryKey({ page: 1, categorySlug: 'tech' }), {
    content: [],
  });
  const { getPublishPostMutationOptions } = await import('@/shared/api/forum/usePublishPost');
  const options = getPublishPostMutationOptions(client);
  mock.onPost('/forum/posts').reply(201, { slug: 'created', subscribed: false });
  const mutation = client.getMutationCache().build(client, options);
  await mutation.execute({ data: { title: 'Title', content: 'Body', categoryId: 1 } });
  expect(
    client
      .getQueryCache()
      .getAll()
      .every((query) => query.state.isInvalidated)
  ).toBe(true);
  client.clear();
});

it('keeps gateway failures unknown and respects per-operation error suppression', async () => {
  mock.onGet('/forum/posts').reply(502, { error: 'Bad Gateway', message: 'upstream unavailable' });
  await expect(operations.listPosts(undefined, { skipErrorToast: true })).rejects.toMatchObject({
    response: { status: 502 },
  });
  expect(toastError).not.toHaveBeenCalled();
  await expect(operations.listPosts()).rejects.toMatchObject({ response: { status: 502 } });
  expect(toastError).toHaveBeenCalledWith('Something went wrong. Please try again.', 'api-error');
});
