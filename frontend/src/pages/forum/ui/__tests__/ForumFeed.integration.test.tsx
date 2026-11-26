import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import type { AxiosInstance } from 'axios';
import { vi } from 'vitest';
import ForumFeed from '@/pages/forum/ui/ForumFeed';
import { apiClient } from '@/shared/api/client/api';
import { toast } from '@/shared/lib/toast';

/**
 * ForumFeed -> useForumPosts -> postService -> the real ApiClient (axios + interceptors).
 * Only the network is faked, so URL, query-string serialization and the error handling of the
 * shared client are covered, which the service-level mocks in ForumFeed.test.tsx cannot show.
 */

let search = '';
const navigate = vi.fn();

vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({
    useNavigate: () => navigate,
    useLocation: () => ({ pathname: '/forum', search: '', hash: '', state: null, key: 'test' }),
    useSearchParams: () => [new URLSearchParams(search), vi.fn()],
  })
);

vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

/** Captured from GET /api/forum/posts on the real backend. */
const REAL_PAGE = {
  content: [
    {
      author: { id: 1, username: 'alice', displayName: null, avatarUrl: null, role: 'USER' },
      category: {
        id: 2,
        name: 'Gaming',
        slug: 'gaming',
        description: null,
        displayOrder: 2,
        visible: true,
        createdAt: '2026-10-10T22:39:00.830154Z',
      },
      commentCount: 4,
      createdAt: '2026-10-10T22:39:12.674315Z',
      id: 8,
      lastActivityAt: '2026-10-10T22:39:12.67421Z',
      pinned: false,
      slug: 'gaming-post-3',
      status: 'PUBLISHED',
      title: 'Gaming post 3',
      viewCount: 0,
      voteScore: 7,
      myVote: null,
    },
  ],
  page: 0,
  size: 10,
  totalElements: 11,
  totalPages: 2,
  first: true,
  last: false,
};

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

function renderFeed() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ForumFeed />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  search = '';
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
});

afterEach(() => {
  mock.restore();
});

describe('ForumFeed over the real API client', () => {
  it('passes exact analytics bounds/category through the generated transport and shows their labels', async () => {
    search =
      'createdFrom=2026-10-10T00:00:00Z&createdTo=2026-10-11T00:00:00Z&categoryId=2&categoryName=Old&page=2';
    mock.onGet('/forum/categories').reply(200, [REAL_PAGE.content[0].category]);
    mock.onGet('/forum/posts').reply(200, { ...REAL_PAGE, page: 1 });
    renderFeed();
    await screen.findByText('Gaming post 3');
    const filters = screen.getByRole('region', { name: 'Publication filters' });
    expect(within(filters).getByText(/Gaming/)).toBeInTheDocument();
    expect(within(filters).getByText(/UTC/)).toBeInTheDocument();
    expect(mock.history.get.find((call) => call.url === '/forum/posts')?.params).toEqual({
      page: 1,
      size: 10,
      sort: 'lastActivityAt',
      createdFrom: '2026-10-10T00:00:00Z',
      createdTo: '2026-10-11T00:00:00Z',
      categoryId: 2,
    });
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not fetch an unfiltered feed for an invalid link and offers to clear it', async () => {
    search = 'createdFrom=2020-02-30T00:00:00Z&tag=java&page=2';
    renderFeed();
    expect(screen.getByRole('alert')).toHaveTextContent('This publication filter is invalid');
    expect(screen.getByRole('link', { name: 'Clear publication filters' })).toHaveAttribute(
      'href',
      '/forum?tag=java'
    );
    expect(mock.history.get).toHaveLength(0);
  });

  it('keeps an unlisted category identity and source label when empty and its name lookup fails', async () => {
    search = 'categoryId=42&categoryName=Former%20name&createdTo=2026-10-11T00:00:00Z';
    mock.onGet('/forum/categories').networkError();
    mock
      .onGet('/forum/posts')
      .reply(200, { ...REAL_PAGE, content: [], totalElements: 0, totalPages: 0 });
    renderFeed();
    await screen.findByText(/No public posts match/);
    expect(screen.getByText(/Former name.*name from analytics/)).toBeInTheDocument();
    expect(screen.getByText(/currently public/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear category' })).toHaveAttribute(
      'href',
      '/forum?createdTo=2026-10-11T00%3A00%3A00Z'
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('replaces the analytics category when choosing a topic, keeping dates and independent filters', async () => {
    search =
      'categoryId=42&uncategorized=false&categoryName=Old&createdFrom=2026-10-10T00:00:00Z&tag=java&sort=new&page=2';
    mock.onGet('/forum/categories').reply(200, []);
    mock.onGet('/forum/posts').reply(200, REAL_PAGE);
    renderFeed();
    await screen.findByText('Gaming post 3');
    // URL mutation/history is also exercised with a real router in the drill-down journey suite.
    await userEvent.click(screen.getByRole('button', { name: 'Gaming' }));
    const url = new URL(navigate.mock.calls.at(-1)![0], 'https://orbita.example');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      createdFrom: '2026-10-10T00:00:00Z',
      tag: 'java',
      sort: 'new',
      topic: 'Gaming',
    });
  });

  it('sends the documented query string and renders the real response shape', async () => {
    mock.onGet('/forum/posts').reply(200, REAL_PAGE);
    renderFeed();

    expect(await screen.findByRole('heading', { name: 'Gaming post 3' })).toBeInTheDocument();
    // The title goes to the post page, by the slug the API gave.
    expect(screen.getByRole('link', { name: 'Gaming post 3' })).toHaveAttribute(
      'href',
      '/forum/gaming-post-3'
    );
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '4 Comments on Gaming post 3' })).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({ page: 0, size: 10, sort: 'lastActivityAt' });
  });

  it('adds the category slug for a topic and the 0-based page for ?page=', async () => {
    search = 'topic=Gaming&page=2';
    mock.onGet('/forum/posts').reply(200, { ...REAL_PAGE, page: 1, first: false, last: true });
    renderFeed();

    await screen.findByText('Gaming post 3');
    expect(mock.history.get[0].params).toEqual({
      page: 1,
      size: 10,
      sort: 'lastActivityAt',
      categorySlug: 'gaming',
    });
  });

  it('shows only the fixed message for a 500 and never toasts the server text', async () => {
    mock
      .onGet('/forum/posts')
      .reply(500, { status: 500, detail: 'PSQLException: relation "posts" does not exist' });
    renderFeed();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load the posts. Please try again.');
    expect(document.body).not.toHaveTextContent('PSQLException');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows the same message for a network failure, again without a toast', async () => {
    mock.onGet('/forum/posts').networkError();
    renderFeed();

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load the posts');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows the fixed message for a 400 from a bad parameter without its server text', async () => {
    mock.onGet('/forum/posts').reply(400, {
      status: 400,
      detail: "Failed to convert 'page' with value: 'abc'",
    });
    renderFeed();

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load the posts');
    expect(document.body).not.toHaveTextContent('Failed to convert');
  });

  it('keeps the global toast for other requests (the opt-out is per request)', async () => {
    mock.onGet('/somewhere-else').reply(500, { status: 500, detail: 'Database is down' });

    await expect(apiClient.get('/somewhere-else')).rejects.toBeDefined();
    expect(toast.error).toHaveBeenCalledWith('Database is down', 'api-error');
  });
});
