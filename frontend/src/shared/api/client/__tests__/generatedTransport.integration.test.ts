import type * as Operations from '@/shared/api/generated/orbita.api';
import type { tokenMemory as TokenMemory } from '@/shared/auth/tokenMemory';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { QueryClient } from '@tanstack/react-query';

const toastError = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: toastError },
}));

let mock: MockAdapter;
let operations: typeof Operations;
let tokenMemory: typeof TokenMemory;

beforeEach(async () => {
  vi.resetModules();
  toastError.mockClear();
  const { apiClient } = await import('../api');
  mock = new MockAdapter((apiClient as unknown as { client: AxiosInstance }).client);
  operations = await import('@/shared/api/generated/orbita.api');
  ({ tokenMemory } = await import('@/shared/auth/tokenMemory'));
  tokenMemory.set(null);
});
afterEach(() => mock.restore());

it('uses the published notification bindings with bearer, pagination, nullable fields and empty 204', async () => {
  tokenMemory.set('access');
  const notification = {
    id: 9,
    type: 'SYSTEM',
    entityType: null,
    entityId: null,
    senderUsername: null,
    message: null,
    read: false,
    createdAt: '2026-11-05T10:00:00Z',
  };
  mock.onGet('/notifications').reply((config) => {
    expect(config.headers?.Authorization).toBe('Bearer access');
    expect(config.withCredentials).toBe(true);
    expect(config.params).toEqual({ unreadOnly: true, page: 1, size: 5 });
    return [200, { content: [notification], page: 1 }];
  });
  await expect(
    operations.listNotifications({ unreadOnly: true, page: 1, size: 5 })
  ).resolves.toMatchObject({ content: [notification], page: 1 });
  mock.onPatch('/notifications/9/read').reply(200, { ...notification, read: true });
  await expect(operations.markRead(9)).resolves.toMatchObject({ id: 9, read: true });
  mock.onPatch('/notifications/read-all').reply(204, '');
  mock.onDelete('/notifications/9').reply(204, '');
  await expect(operations.markAllRead()).resolves.toBeUndefined();
  await expect(operations.deleteNotification(9)).resolves.toBeUndefined();
});

it('routes generated analytics parameters and keys through the same transport', async () => {
  tokenMemory.set('access');
  const params = { metric: 'posts', period: '7d' } as const;
  const trend = { ...params, total: 0, data: [] };
  mock.onGet('/analytics/trends').reply((config) => {
    expect(config.headers?.Authorization).toBe('Bearer access');
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
});

it('uses the gateway base, bearer on public reads, encoded paths and generated query parameters', async () => {
  tokenMemory.set('access');
  mock.onGet('/forum/posts').reply((config) => {
    expect(config.baseURL).toMatch(/\/api$/);
    expect(config.withCredentials).toBe(true);
    expect(config.headers?.Authorization).toBe('Bearer access');
    expect(config.params).toEqual({ categoryId: 7, author: 'alice', status: 'PUBLISHED', page: 2 });
    return [200, { content: [], page: 2 }];
  });
  await operations.listPosts({ categoryId: 7, author: 'alice', status: 'PUBLISHED', page: 2 });
  mock.onGet('/forum/posts/a%2Fb%20%3F').reply(200, { slug: 'a/b ?' });
  await expect(operations.getPost('a/b ?')).resolves.toEqual({ slug: 'a/b ?' });
});

it('sends generated auth bodies while refresh/logout carry no readable refresh token', async () => {
  mock.onPost('/auth/login').reply((config) => {
    expect(JSON.parse(config.data)).toEqual({ username: 'alice', password: 'Password123' });
    return [200, { accessToken: 'access', tokenType: 'Bearer', expiresIn: 3600 }];
  });
  await operations.login({ username: 'alice', password: 'Password123' });
  mock.onPost('/auth/refresh').reply((config) => {
    expect(config.withCredentials).toBe(true);
    expect(config.data).toBeUndefined();
    return [200, { accessToken: 'new', tokenType: 'Bearer', expiresIn: 3600 }];
  });
  mock.onPost('/auth/logout').reply((config) => {
    expect(config.data).toBeUndefined();
    return [204, ''];
  });
  await operations.refresh();
  await expect(operations.logout()).resolves.toBeUndefined();
});

it('shares one rotating refresh between concurrent generated requests and retries with the new bearer', async () => {
  tokenMemory.set('expired');
  mock
    .onGet('/users/me')
    .reply((config) =>
      config.headers?.Authorization === 'Bearer fresh' ? [200, { id: 1 }] : [401, { status: 401 }]
    );
  mock
    .onGet('/forum/posts')
    .reply((config) =>
      config.headers?.Authorization === 'Bearer fresh'
        ? [200, { content: [] }]
        : [401, { status: 401 }]
    );
  mock.onPost('/auth/refresh').reply(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return [200, { accessToken: 'fresh' }];
  });
  await Promise.all([operations.currentProfile(), operations.listPosts()]);
  expect(mock.history.post.filter((request) => request.url === '/auth/refresh')).toHaveLength(1);
  expect(mock.history.get).toHaveLength(4);
  expect(tokenMemory.get()).toBe('fresh');
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

it('ends the session after exactly one retry when a generated request rejects the refreshed bearer', async () => {
  tokenMemory.set('expired');
  mock.onGet('/users/me').reply(401, { status: 401 });
  mock.onPost('/auth/refresh').reply(200, { accessToken: 'fresh' });
  await expect(operations.currentProfile()).rejects.toMatchObject({ response: { status: 401 } });
  expect(mock.history.get).toHaveLength(2);
  expect(mock.history.post).toHaveLength(1);
  expect(tokenMemory.get()).toBeNull();
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
