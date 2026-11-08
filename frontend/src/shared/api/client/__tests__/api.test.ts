import axios, { type AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import { apiClient } from '../api';
import { sessionEvents } from '@/shared/auth/sessionEvents';

vi.mock('@/shared/lib/toast', () => ({ toast: { error: vi.fn() }, API_ERROR_TOAST_ID: 'api' }));
let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter((apiClient as unknown as { client: AxiosInstance }).client);
  apiClient.clearCsrf();
  apiClient.setUnauthorizedHandler(undefined);
  sessionEvents.advance();
});
afterEach(() => mock.restore());

it('uses cookies and sends no Bearer authentication', async () => {
  mock.onGet('/users/me').reply((config) => {
    expect(config.withCredentials).toBe(true);
    expect(config.headers?.Authorization).toBeUndefined();
    return [200, { id: 1 }];
  });
  expect(await apiClient.get('/users/me')).toEqual({ id: 1 });
});

it('bootstraps CSRF once for concurrent mutations and preserves their bodies', async () => {
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  mock.onPost('/forum/posts').reply((config) => {
    expect(config.headers?.['X-CSRF-TOKEN']).toBe('csrf');
    expect(JSON.parse(config.data as string)).toEqual({ content: 'body' });
    return [201, { id: 2 }];
  });
  await Promise.all([
    apiClient.post('/forum/posts', { content: 'body' }),
    apiClient.post('/forum/posts', { content: 'body' }),
  ]);
  expect(mock.history.get.filter((config) => config.url === '/auth/csrf')).toHaveLength(1);
});

it.each([401, 403, 500, 502, 504])(
  'never refreshes or replays an unsafe request after %s',
  async (status) => {
    mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
    mock.onPost('/forum/posts').reply(status, { detail: 'Rejected' });
    await expect(apiClient.post('/forum/posts', {})).rejects.toBeDefined();
    expect(mock.history.post).toHaveLength(1);
    expect(mock.history.post.some((config) => config.url === '/auth/refresh')).toBe(false);
  }
);

it('normalizes an empty 204 response', async () => {
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  mock.onPost('/auth/login').reply(204);
  expect(await apiClient.post('/auth/login', {})).toBeUndefined();
});

it('rejects a late old-generation response before a caller can cache it', async () => {
  let finish!: (value: [number, object]) => void;
  mock.onGet('/slow').reply(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const pending = apiClient.get('/slow');
  await vi.waitFor(() => expect(finish).toBeDefined());
  sessionEvents.advance();
  finish([200, { old: true }]);
  await expect(pending).rejects.toSatisfy(axios.isCancel);
});

it('a stale 401 cannot terminate a newer identity', async () => {
  let finish!: (value: [number, object]) => void;
  const unauthorized = vi.fn();
  apiClient.setUnauthorizedHandler(unauthorized);
  mock.onGet('/slow').reply(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const pending = apiClient.get('/slow');
  await vi.waitFor(() => expect(finish).toBeDefined());
  sessionEvents.advance();
  finish([401, {}]);
  await expect(pending).rejects.toSatisfy(axios.isCancel);
  expect(unauthorized).not.toHaveBeenCalled();
});

it('lets a user bootstrap a new CSRF token after rejection without replaying the failed mutation', async () => {
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  mock.onPost('/edit').replyOnce(403).onPost('/edit').reply(204);
  await expect(apiClient.post('/edit', {})).rejects.toBeDefined();
  await apiClient.post('/edit', {});
  expect(mock.history.get).toHaveLength(2);
  expect(mock.history.post).toHaveLength(2);
});
