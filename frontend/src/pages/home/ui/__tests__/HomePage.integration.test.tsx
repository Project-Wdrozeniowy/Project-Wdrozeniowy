import { transferableAbortController } from 'node:util';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';
import HomePage from '@/pages/home/ui/HomePage';
import { apiClient } from '@/shared/api/client/api';
import type { PostSummaryDto as PostSummary } from '@/shared/api/generated/models/postSummaryDto.dto';
import { useStore } from '@/store';
import { makePost } from '@/test/fakeAnalyticsServer';

/**
 * HomePage -> the sort tabs -> the feed query -> the real ApiClient. Only the network is faked, and
 * it answers as the API does: the order is the server's, and a sort is a request.
 */

vi.unmock('react-router');
vi.mock('@/features/create-post/CreatePostButton', () => ({ CreatePostButton: () => null }));

// jsdom's controller is incompatible with Node 24's native Request used by the data router.
vi.stubGlobal('AbortController', transferableAbortController().constructor);
afterAll(() => vi.unstubAllGlobals());

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

/** The same three posts, ranked differently by each order, as in the real data. */
const BY_ORDER: Record<string, string[]> = {
  createdAt: ['Newest', 'Commented', 'Oldest'],
  voteScore: ['Oldest', 'Newest', 'Commented'],
};

function pageFor(sort: string) {
  const titles = BY_ORDER[sort];
  return {
    content: titles.map((title, index) => makePost(index + 1, title) as unknown as PostSummary),
    page: 0,
    size: 10,
    totalElements: 25,
    totalPages: 3,
    first: true,
    last: false,
  };
}

const requested = () =>
  mock.history.get.filter((request) => request.url === '/forum/posts').map((r) => r.params.sort);
const shownTitles = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);

function renderHome(initial: string[], index = initial.length - 1) {
  const router = createMemoryRouter(
    [
      { path: '/', Component: HomePage },
      { path: '/forum', element: null },
    ],
    { initialEntries: initial, initialIndex: index }
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
}

beforeEach(() => {
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  mock.onGet('/forum/posts').reply((config) => [200, pageFor(config.params.sort)]);
  useStore.setState({ isAuthenticated: false, isInitialized: true });
});

afterEach(() => mock.restore());

describe('the sort tabs of the home page', () => {
  it('opens on New, marks it, and shows Hot as not available yet instead of a link', async () => {
    renderHome(['/']);

    await waitFor(() => expect(shownTitles()).toEqual(BY_ORDER.createdAt));
    expect(requested()).toEqual(['createdAt']);
    const tabs = screen.getByRole('navigation', { name: 'Sort posts' });
    expect(within(tabs).getByRole('link', { name: 'New' })).toHaveAttribute('aria-current', 'page');
    expect(within(tabs).getByRole('link', { name: 'New' })).toHaveAttribute('href', '/');
    expect(within(tabs).getByRole('link', { name: 'Top' })).toHaveAttribute('href', '/?sort=top');
    // Hot has no ranking behind it: nothing to press, and it says so.
    expect(within(tabs).queryByRole('link', { name: /Hot/ })).toBeNull();
    const hot = within(tabs).getByText('Hot').closest('[aria-disabled]');
    expect(hot).toHaveAttribute('aria-disabled', 'true');
    expect(hot).toHaveTextContent('Not available yet');
  });

  it("Top asks the server for voteScore and shows the server's order", async () => {
    const router = renderHome(['/']);
    await waitFor(() => expect(shownTitles()).toEqual(BY_ORDER.createdAt));

    await userEvent.setup().click(screen.getByRole('link', { name: 'Top' }));

    await waitFor(() => expect(requested()).toContain('voteScore'));
    await waitFor(() => expect(shownTitles()).toEqual(BY_ORDER.voteScore));
    expect(router.state.location.search).toBe('?sort=top');
    expect(screen.getByRole('link', { name: 'Top' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'New' })).not.toHaveAttribute('aria-current');
  });

  it('goes back to New with the bare address', async () => {
    const router = renderHome(['/?sort=top']);
    await waitFor(() => expect(shownTitles()).toEqual(BY_ORDER.voteScore));

    await userEvent.setup().click(screen.getByRole('link', { name: 'New' }));

    await waitFor(() => expect(shownTitles()).toEqual(BY_ORDER.createdAt));
    expect(router.state.location.search).toBe('');
  });

  it('opens on the order of the address, after a reload or from a shared link', async () => {
    renderHome(['/?sort=top']);

    await waitFor(() => expect(shownTitles()).toEqual(BY_ORDER.voteScore));
    expect(requested()).toEqual(['voteScore']);
    expect(screen.getByRole('link', { name: 'Top' })).toHaveAttribute('aria-current', 'page');
  });

  it.each(['hot', 'best'])(
    'takes ?sort=%s for New instead of asking the API for it',
    async (value) => {
      renderHome([`/?sort=${value}`]);

      await waitFor(() => expect(shownTitles()).toEqual(BY_ORDER.createdAt));
      expect(requested()).toEqual(['createdAt']);
      expect(screen.getByRole('link', { name: 'New' })).toHaveAttribute('aria-current', 'page');
    }
  );

  it('does not show the previous order while the next one loads', async () => {
    renderHome(['/']);
    await waitFor(() => expect(shownTitles()).toEqual(BY_ORDER.createdAt));

    // The first handler that matches answers, so the held-back answer replaces the others.
    let finish: () => void = () => {};
    mock.resetHandlers();
    mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
    mock
      .onGet('/forum/posts')
      .reply(() => new Promise((resolve) => (finish = () => resolve([200, pageFor('voteScore')]))));
    await userEvent.setup().click(screen.getByRole('link', { name: 'Top' }));

    // The New posts are gone, and a loading state says so: they would look like the Top ones.
    await waitFor(() => expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0));
    expect(screen.getByRole('status')).toBeInTheDocument();

    await act(async () => finish());
    await waitFor(() => expect(shownTitles()).toEqual(BY_ORDER.voteScore));
  });

  it('replaces the history entry, so Back leaves the page and does not walk the tabs', async () => {
    const router = renderHome(['/forum', '/']);
    await waitFor(() => expect(shownTitles()).toEqual(BY_ORDER.createdAt));
    const user = userEvent.setup();

    await user.click(screen.getByRole('link', { name: 'Top' }));
    await waitFor(() => expect(shownTitles()).toEqual(BY_ORDER.voteScore));
    await user.click(screen.getByRole('link', { name: 'New' }));
    await waitFor(() => expect(shownTitles()).toEqual(BY_ORDER.createdAt));

    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe('/forum');
  });

  it('carries the order into "See all posts"', async () => {
    renderHome(['/?sort=top']);

    expect(await screen.findByRole('link', { name: /See all posts/ })).toHaveAttribute(
      'href',
      '/forum?sort=top'
    );
  });

  it('says so, with a retry, when the posts of an order cannot be loaded', async () => {
    mock.onGet('/forum/posts').reply(500, { status: 500, detail: 'secret internals' });
    renderHome(['/?sort=top']);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i);
    expect(screen.queryByText(/secret internals/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('says there are no posts, for an order too, when there are none', async () => {
    mock
      .onGet('/forum/posts')
      .reply(200, { ...pageFor('createdAt'), content: [], totalElements: 0, totalPages: 0 });
    renderHome(['/?sort=top']);

    expect(await screen.findByText('No posts yet.')).toBeInTheDocument();
  });
});
