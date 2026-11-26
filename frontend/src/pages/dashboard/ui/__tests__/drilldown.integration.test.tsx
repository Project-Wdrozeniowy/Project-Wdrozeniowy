import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import { transferableAbortController } from 'node:util';
import DashboardPage from '../DashboardPage';
import ForumFeed from '@/pages/forum/ui/ForumFeed';
import { apiClient } from '@/shared/api/client/api';
import { fakeAnalyticsServer, DEFAULT_ANALYTICS } from '@/test/fakeAnalyticsServer';
import { useStore } from '@/store';

vi.unmock('react-router');
vi.stubGlobal('AbortController', transferableAbortController().constructor);
afterAll(() => vi.unstubAllGlobals());
let mock: MockAdapter;
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  useStore.setState({ isAuthenticated: false, isInitialized: true });
  mock = new MockAdapter((apiClient as unknown as { client: AxiosInstance }).client);
  fakeAnalyticsServer(mock);
  mock.onGet('/forum/categories').reply(200, []);
  mock.onGet('/forum/posts').reply(200, {
    content: [],
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  });
});
afterEach(() => {
  mock.restore();
  vi.restoreAllMocks();
});

function mount(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/dashboard', Component: DashboardPage },
      { path: '/forum', Component: ForumFeed },
    ],
    { initialEntries: [path] }
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
}

it('restores period, metric and both tables through navigation and remount from a copied URL', async () => {
  const router = mount('/dashboard?period=30d&metric=posts&activityTable=1&categoryTable=1');
  const user = userEvent.setup();
  await screen.findAllByRole('link', { name: /Open 80 posts.*Oct 20/ });
  expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(screen.getAllByRole('table')).toHaveLength(2);
  const categories = screen.getByRole('region', { name: 'Posts by category' });
  const link = within(categories).getAllByRole('link', { name: /Open .*Science/ })[0];
  await user.click(link);
  await screen.findByText(/No public posts match/);
  const data = DEFAULT_ANALYTICS.categories('30d');
  expect(router.state.location.pathname).toBe('/forum');
  const params = new URLSearchParams(router.state.location.search);
  expect(params.get('createdFrom')).toBe(data.windowStart);
  expect(params.get('createdTo')).toBe(data.windowEnd);
  expect(params.get('categoryId')).toBe(String(data.categories[0].category!.id));
  await act(() => router.navigate(-1));
  expect(await screen.findByRole('button', { name: 'Category data table' })).toHaveAttribute(
    'aria-expanded',
    'true'
  );
  expect(screen.getByRole('button', { name: 'Data table' })).toHaveAttribute(
    'aria-expanded',
    'true'
  );
  expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await user.click(screen.getByRole('radio', { name: 'Comments' }));
  await waitFor(() =>
    expect(new URLSearchParams(router.state.location.search).get('metric')).toBe('comments')
  );
  const activity = screen.getByRole('region', { name: 'Posts and comments by day' });
  expect(within(activity).queryByRole('link')).not.toBeInTheDocument();
});

it('opens identical UTC day bounds from graph and table', async () => {
  const router = mount('/dashboard?activityTable=1');
  const links = await screen.findAllByRole('link', { name: /Open 20 posts.*Nov 16/ });
  expect(links).toHaveLength(2);
  expect(links[0].getAttribute('href')).toBe(links[1].getAttribute('href'));
  await userEvent.click(links[0]);
  const params = new URLSearchParams(router.state.location.search);
  expect(params.get('createdFrom')).toBe('2026-11-16T00:00:00Z');
  expect(params.get('createdTo')).toBe('2026-11-17T00:00:00Z');
  expect(params.has('categoryId')).toBe(false);
});

it('uses safe URL defaults and replaces screen-setting changes without losing unrelated parameters', async () => {
  const router = mount('/dashboard?period=bad&metric=bad&activityTable=no&keep=1');
  await screen.findByRole('button', { name: 'Data table' });
  expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(screen.getByRole('radio', { name: 'Posts' })).toBeChecked();
  expect(screen.getByRole('button', { name: 'Data table' })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
  await userEvent.click(screen.getByRole('button', { name: 'Data table' }));
  expect(new URLSearchParams(router.state.location.search).get('keep')).toBe('1');
  expect(new URLSearchParams(router.state.location.search).get('activityTable')).toBe('1');
  expect(router.state.historyAction).toBe('REPLACE');
});
