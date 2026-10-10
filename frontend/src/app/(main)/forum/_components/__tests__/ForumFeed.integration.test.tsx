import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import type { AxiosInstance } from 'axios';
import { vi } from 'vitest';
import ForumFeed from '../ForumFeed';
import { apiClient } from '@/services/api';
import { toast } from '@/lib/toast';

/**
 * ForumFeed -> useForumPosts -> postService -> the real ApiClient (axios + interceptors).
 * Only the network is faked, so URL, query-string serialization and the error handling of the
 * shared client are covered, which the service-level mocks in ForumFeed.test.tsx cannot show.
 */

let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/forum',
  useSearchParams: () => new URLSearchParams(search),
}));

vi.mock('@/lib/toast', () => ({
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
});

afterEach(() => {
  mock.restore();
});

describe('ForumFeed over the real API client', () => {
  it('sends the documented query string and renders the real response shape', async () => {
    mock.onGet('/forum/posts').reply(200, REAL_PAGE);
    renderFeed();

    expect(await screen.findByRole('link', { name: 'Gaming post 3' })).toHaveAttribute(
      'href',
      '/forum/gaming-post-3'
    );
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('4 Comments')).toBeInTheDocument();
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
