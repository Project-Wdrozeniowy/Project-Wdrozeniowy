import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ForumFeed from '../ForumFeed';
import { postService } from '@/services/forumService';
import type { PagedResponse, PostSummary } from '@/shared/types';

const mockPush = vi.fn();
const mockReplace = vi.fn();
let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/forum',
  useSearchParams: () => new URLSearchParams(search),
}));

vi.mock('@/services/forumService', () => ({
  postService: { list: vi.fn() },
}));

const list = vi.mocked(postService.list);

function makePost(id: number, overrides: Partial<PostSummary> = {}): PostSummary {
  return {
    id,
    title: `Post ${id}`,
    slug: `post-${id}`,
    status: 'PUBLISHED',
    pinned: false,
    viewCount: 0,
    voteScore: 3,
    commentCount: 2,
    category: {
      id: 1,
      name: 'Gaming',
      slug: 'gaming',
      description: null,
      displayOrder: 1,
      visible: true,
      createdAt: '2026-10-01T10:00:00Z',
    },
    author: { id: 1, username: 'alice', displayName: null, avatarUrl: null, role: 'USER' },
    lastActivityAt: '2026-10-10T10:00:00Z',
    createdAt: '2026-10-10T10:00:00Z',
    ...overrides,
  };
}

function pageOf(
  ids: number[],
  { page = 0, totalPages = 1, totalElements = ids.length } = {}
): PagedResponse<PostSummary> {
  return {
    content: ids.map((id) => makePost(id)),
    page,
    size: 10,
    totalElements,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1,
  };
}

function renderFeed() {
  // One client for the whole test, like the real app: a rerender keeps the query cache.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // A new element each time, otherwise React skips the re-render.
  const ui = () => (
    <QueryClientProvider client={client}>
      <ForumFeed />
    </QueryClientProvider>
  );
  const result = render(ui());
  return { ...result, client, rerenderFeed: () => result.rerender(ui()) };
}

function postTitles() {
  return screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
}

beforeEach(() => {
  vi.clearAllMocks();
  search = '';
});

describe('ForumFeed – data flow', () => {
  it('requests the real paginated API, not fixtures', async () => {
    list.mockResolvedValue(pageOf([3, 2, 1]));
    renderFeed();

    expect(await screen.findByText('Post 3')).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith(
      { page: 0, size: 10, sort: 'lastActivityAt', categorySlug: undefined },
      // The feed shows its own fixed message, so the global toast (which prints server text) is off.
      { skipErrorToast: true }
    );
  });

  it('renders the posts of the server page in the server order', async () => {
    list.mockResolvedValue(pageOf([30, 20, 10]));
    renderFeed();

    await screen.findByText('Post 30');
    expect(postTitles()).toEqual(['Post 30', 'Post 20', 'Post 10']);
  });

  it('links each title to its post page', async () => {
    list.mockResolvedValue(pageOf([7]));
    renderFeed();

    expect(await screen.findByRole('link', { name: 'Post 7' })).toHaveAttribute(
      'href',
      '/forum/post-7'
    );
  });

  it('shows a post without a category and without an author display name', async () => {
    list.mockResolvedValue({
      ...pageOf([1]),
      content: [makePost(1, { category: null })],
    });
    renderFeed();

    expect(await screen.findByText('Post 1')).toBeInTheDocument();
    const card = within(screen.getByRole('article'));
    expect(card.getByText('alice')).toBeInTheDocument();
    // "Gaming" is also a filter button, so look inside the card only.
    expect(card.queryByText('Gaming')).not.toBeInTheDocument();
  });
});

describe('ForumFeed – pagination', () => {
  it('renders the requested page from ?page= (1-based in the URL, 0-based for the API)', async () => {
    search = 'page=2';
    list.mockResolvedValue(pageOf([5, 4, 3], { page: 1, totalPages: 3, totalElements: 8 }));
    renderFeed();

    await screen.findByText('Post 5');
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }), expect.anything());
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('shows only the new page after navigating: nothing duplicated, nothing from the old page', async () => {
    list.mockResolvedValue(pageOf([8, 7, 6], { page: 0, totalPages: 3, totalElements: 8 }));
    const { rerenderFeed } = renderFeed();
    await screen.findByText('Post 8');

    search = 'page=2';
    list.mockResolvedValue(pageOf([5, 4, 3], { page: 1, totalPages: 3, totalElements: 8 }));
    rerenderFeed();

    await screen.findByText('Post 5');
    expect(postTitles()).toEqual(['Post 5', 'Post 4', 'Post 3']);
  });

  it('shows the page that is being loaded, not the previous one, while it loads', async () => {
    list.mockResolvedValue(pageOf([8, 7, 6], { page: 0, totalPages: 3, totalElements: 8 }));
    const { rerenderFeed } = renderFeed();
    await screen.findByText('Post 8');
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

    search = 'page=2';
    list.mockReturnValue(new Promise(() => {}));
    rerenderFeed();

    // The old posts stay visible (dimmed), but the indicator already follows the URL.
    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Post 8')).toBeInTheDocument();
  });

  it('pushes the next page into the URL', async () => {
    list.mockResolvedValue(pageOf([8, 7, 6], { page: 0, totalPages: 3, totalElements: 8 }));
    renderFeed();
    await screen.findByText('Post 8');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Next' }));

    expect(mockPush).toHaveBeenCalledWith('/forum?page=2');
  });

  it('goes back to the first page by dropping the parameter', async () => {
    search = 'page=2';
    list.mockResolvedValue(pageOf([5, 4, 3], { page: 1, totalPages: 3, totalElements: 8 }));
    renderFeed();
    await screen.findByText('Post 5');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Previous' }));

    expect(mockPush).toHaveBeenCalledWith('/forum');
  });

  it('disables Previous on the first page and Next on the last', async () => {
    list.mockResolvedValue(pageOf([8, 7, 6], { page: 0, totalPages: 2, totalElements: 8 }));
    const { unmount } = renderFeed();
    await screen.findByText('Post 8');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    unmount();

    search = 'page=2';
    list.mockResolvedValue(pageOf([2, 1], { page: 1, totalPages: 2, totalElements: 8 }));
    renderFeed();
    await screen.findByText('Post 2');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('hides the controls when everything fits on one page', async () => {
    list.mockResolvedValue(pageOf([2, 1]));
    renderFeed();
    await screen.findByText('Post 2');

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });

  it.each(['page=0', 'page=-3', 'page=abc', 'page=2.5'])(
    'treats an invalid parameter (%s) as the first page',
    async (value) => {
      search = value;
      list.mockResolvedValue(pageOf([1]));
      renderFeed();

      await screen.findByText('Post 1');
      expect(list).toHaveBeenCalledWith(expect.objectContaining({ page: 0 }), expect.anything());
    }
  );

  it('offers a way back when the page is past the end', async () => {
    search = 'page=9';
    list.mockResolvedValue({ ...pageOf([], { page: 8, totalPages: 3, totalElements: 8 }) });
    renderFeed();

    expect(await screen.findByText('This page does not exist.')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Go to the first page' }));
    expect(mockPush).toHaveBeenCalledWith('/forum');
  });
});

describe('ForumFeed – topic filter', () => {
  it('sends the category slug of the active topic', async () => {
    search = 'topic=Gaming';
    list.mockResolvedValue(pageOf([1]));
    renderFeed();

    await screen.findByText('Post 1');
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ categorySlug: 'gaming' }),
      expect.anything()
    );
  });

  it('maps a topic whose label differs from its slug', async () => {
    search = 'topic=AI+%2F+Tech';
    list.mockResolvedValue(pageOf([1]));
    renderFeed();

    await screen.findByText('Post 1');
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ categorySlug: 'ai' }),
      expect.anything()
    );
  });

  it('ignores an unknown topic', async () => {
    search = 'topic=Nonsense';
    list.mockResolvedValue(pageOf([1]));
    renderFeed();

    await screen.findByText('Post 1');
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ categorySlug: undefined }),
      expect.anything()
    );
  });

  it('puts the topic in the URL and resets the page', async () => {
    search = 'page=3';
    list.mockResolvedValue(pageOf([5], { page: 2, totalPages: 4, totalElements: 31 }));
    renderFeed();
    await screen.findByText('Post 5');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Science' }));

    expect(mockReplace).toHaveBeenCalledWith('/forum?topic=Science', { scroll: false });
  });

  it('removes the topic when All is selected but keeps unrelated parameters', async () => {
    search = 'topic=Science&utm=x';
    list.mockResolvedValue(pageOf([1]));
    renderFeed();
    await screen.findByText('Post 1');

    await userEvent.setup().click(screen.getByRole('button', { name: 'All' }));

    expect(mockReplace).toHaveBeenCalledWith('/forum?utm=x', { scroll: false });
  });
});

describe('ForumFeed – states', () => {
  it('shows an accessible loading state first', () => {
    list.mockReturnValue(new Promise(() => {}));
    renderFeed();

    const loading = screen.getByRole('status', { name: 'Loading posts' });
    expect(loading).toHaveAttribute('aria-busy', 'true');
  });

  it('shows an empty state', async () => {
    list.mockResolvedValue(pageOf([], { totalPages: 0, totalElements: 0 }));
    renderFeed();

    expect(await screen.findByText('No posts yet.')).toBeInTheDocument();
  });

  it('shows a topic-specific empty state', async () => {
    search = 'topic=Gaming';
    list.mockResolvedValue(pageOf([], { totalPages: 0, totalElements: 0 }));
    renderFeed();

    expect(await screen.findByText('No posts in this topic yet.')).toBeInTheDocument();
  });

  it('shows a generic error that never exposes server details, and recovers on retry', async () => {
    list.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'Request failed with status code 500',
      response: {
        status: 500,
        data: { detail: 'PSQLException: relation "posts" does not exist at com.devpulse.Foo' },
      },
    });
    renderFeed();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load the posts. Please try again.');
    expect(document.body).not.toHaveTextContent(/PSQLException|relation|com\.devpulse|status code/);

    list.mockResolvedValue(pageOf([1]));
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Post 1')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the same generic error for a network failure', async () => {
    list.mockRejectedValue(new Error('Network Error'));
    renderFeed();

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load the posts');
    await waitFor(() => expect(document.body).not.toHaveTextContent('Network Error'));
  });

  it('swaps the error for the loading state while retrying, and asks the API again once', async () => {
    list.mockRejectedValueOnce(new Error('Network Error'));
    renderFeed();
    const alert = await screen.findByRole('alert');
    expect(list).toHaveBeenCalledTimes(1);

    list.mockReturnValue(new Promise(() => {}));
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('status', { name: 'Loading posts' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('keeps the loaded posts and shows a notice when a background refresh fails', async () => {
    list.mockResolvedValue(pageOf([8, 7, 6], { page: 0, totalPages: 3, totalElements: 8 }));
    const { client } = renderFeed();
    await screen.findByText('Post 8');

    list.mockRejectedValue(new Error('Network Error'));
    await act(async () => {
      await client.refetchQueries({ queryKey: ['forum-posts'] });
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load the posts');
    // The user keeps what they were reading and the controls.
    expect(postTitles()).toEqual(['Post 8', 'Post 7', 'Post 6']);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });
});
