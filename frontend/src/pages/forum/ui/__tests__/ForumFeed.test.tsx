import type { ApiRequestOptions } from '@/shared/api/client/orvalTransport';
import type { AxiosRequestConfig } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ForumFeed from '@/pages/forum/ui/ForumFeed';
import { ACTION_UNAVAILABLE_HINT } from '@/widgets/post-feed/config/postCard.const';
import { useStore } from '@/store';
import type { PagedResponse } from '@/shared/api/client/pagination.dto';
import type { PostSummaryDto as PostSummary } from '@/shared/api/generated/models/postSummaryDto.dto';

const mockPush = vi.fn();
const mockReplace = vi.fn();
let search = '';

vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({
    useNavigate:
      () => (url: string, options?: { replace?: boolean; preventScrollReset?: boolean }) =>
        options?.replace ? mockReplace(url, options) : mockPush(url),
    useLocation: () => ({ pathname: '/forum', search: '', hash: '', state: null, key: 'test' }),
    useSearchParams: () => [new URLSearchParams(search), vi.fn()],
  })
);

const fixtureOperations = vi.hoisted(() => ({
  postService: { list: vi.fn() },
  voteService: { cast: vi.fn(), retract: vi.fn() },
}));
const { postService, voteService } = fixtureOperations;
vi.mock('@/shared/api/client/orvalTransport', async () => {
  const { mockApiOperations } = await import('@/test/mockApiOperations');
  return {
    orvalTransport: (config: AxiosRequestConfig, options: ApiRequestOptions) =>
      mockApiOperations(config, options, fixtureOperations),
  };
});

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
    myVote: null,
    tags: [],
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
  useStore.setState({ isAuthenticated: false, isInitialized: true });
});

describe('ForumFeed – data flow', () => {
  it('requests the real paginated API, not fixtures', async () => {
    list.mockResolvedValue(pageOf([3, 2, 1]));
    renderFeed();

    expect(await screen.findByText('Post 3')).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith(
      { page: 0, size: 10, sort: 'lastActivityAt', categorySlug: undefined, tag: undefined },
      // The feed shows its own fixed message, so the global toast (which prints server text) is off.
      expect.objectContaining({ skipErrorToast: true, signal: expect.any(AbortSignal) })
    );
  });

  it('renders the posts of the server page in the server order', async () => {
    list.mockResolvedValue(pageOf([30, 20, 10]));
    renderFeed();

    await screen.findByText('Post 30');
    expect(postTitles()).toEqual(['Post 30', 'Post 20', 'Post 10']);
  });

  it('links the title and the comments of each post to its page', async () => {
    list.mockResolvedValue(pageOf([7]));
    renderFeed();

    await screen.findByText('Post 7');
    const card = within(screen.getByRole('article'));
    const href = card.getByRole('link', { name: 'Post 7' }).getAttribute('href');
    expect(href).toMatch(/^\/forum\/.+/);
    expect(card.getByRole('link', { name: '2 Comments on Post 7' })).toHaveAttribute(
      'href',
      `${href}#comments`
    );
  });

  it('disables sharing and saving on real posts, and says why', async () => {
    list.mockResolvedValue(pageOf([7]));
    renderFeed();
    await screen.findByText('Post 7');
    const card = within(screen.getByRole('article'));

    for (const name of ['Share', 'Save']) {
      const button = card.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', ACTION_UNAVAILABLE_HINT);
    }
  });

  it('sends a guest to the login page instead of voting', async () => {
    list.mockResolvedValue(pageOf([7]));
    renderFeed();
    await screen.findByText('Post 7');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Upvote' }));

    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(voteService.cast).not.toHaveBeenCalled();
  });

  it('casts a vote for a signed-in user and shows the score the server answers with', async () => {
    useStore.setState({ isAuthenticated: true });
    // The server answers the refresh that follows a vote with the updated post, as a real one does.
    list.mockResolvedValueOnce(pageOf([7])).mockResolvedValue({
      ...pageOf([7]),
      content: [makePost(7, { voteScore: 4, myVote: { id: 55, voteType: 'UP' } })],
    });
    vi.mocked(voteService.cast).mockResolvedValue({
      id: 55,
      entityType: 'POST',
      entityId: 7,
      voteType: 'UP',
      newScore: 4,
      createdAt: '2026-10-15T10:00:00Z',
    });
    renderFeed();
    await screen.findByText('Post 7');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Upvote' }));

    expect(voteService.cast).toHaveBeenCalledWith(
      { entityType: 'POST', entityId: 7, voteType: 'UP' },
      { skipErrorToast: true }
    );
    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upvote' })).toHaveClass('text-accent');
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

  it('shows only the posts of the new page after navigating', async () => {
    list.mockResolvedValue(pageOf([8, 7, 6], { page: 0, totalPages: 3, totalElements: 8 }));
    const { rerenderFeed } = renderFeed();
    await screen.findByText('Post 8');

    search = 'page=2';
    list.mockResolvedValue(pageOf([5, 4, 3], { page: 1, totalPages: 3, totalElements: 8 }));
    rerenderFeed();

    await screen.findByText('Post 5');
    expect(postTitles()).toEqual(['Post 5', 'Post 4', 'Post 3']);
  });

  it('says which page is loading and does not leave the previous posts on screen', async () => {
    list.mockResolvedValue(pageOf([8, 7, 6], { page: 0, totalPages: 3, totalElements: 8 }));
    const { rerenderFeed } = renderFeed();
    await screen.findByText('Post 8');
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

    search = 'page=2';
    list.mockReturnValue(new Promise(() => {}));
    rerenderFeed();

    // A visible, announced message, and nothing that looks like the content of page 2.
    const loading = await screen.findByRole('status', { name: 'Loading page 2…' });
    expect(loading).toHaveTextContent('Loading page 2…');
    expect(loading).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Post 8')).not.toBeInTheDocument();
    expect(screen.queryByText('Post 7')).not.toBeInTheDocument();
    // The indicator names the page being loaded, never the old one.
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.queryByText('Page 1 of 3')).not.toBeInTheDocument();
  });

  it('keeps the pagination (and keyboard focus on it) while the next page loads', async () => {
    list.mockResolvedValue(pageOf([8, 7, 6], { page: 0, totalPages: 3, totalElements: 8 }));
    const { rerenderFeed } = renderFeed();
    await screen.findByText('Post 8');
    const next = screen.getByRole('button', { name: 'Next' });
    next.focus();

    search = 'page=2';
    list.mockReturnValue(new Promise(() => {}));
    rerenderFeed();
    await screen.findByRole('status', { name: 'Loading page 2…' });

    // The same element survived, so a keyboard user does not have to tab back to it.
    expect(screen.getByRole('button', { name: 'Next' })).toBe(next);
    expect(next).toHaveFocus();
    expect(next).toHaveAttribute('aria-disabled', 'true');
  });

  it('ignores page changes while a page is still loading', async () => {
    list.mockResolvedValue(pageOf([8, 7, 6], { page: 0, totalPages: 3, totalElements: 8 }));
    const { rerenderFeed } = renderFeed();
    await screen.findByText('Post 8');
    search = 'page=2';
    list.mockReturnValue(new Promise(() => {}));
    rerenderFeed();
    await screen.findByRole('status', { name: 'Loading page 2…' });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Next' }));

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows the new page and its controls once it has loaded', async () => {
    list.mockResolvedValue(pageOf([8, 7, 6], { page: 0, totalPages: 3, totalElements: 8 }));
    const { rerenderFeed } = renderFeed();
    await screen.findByText('Post 8');

    search = 'page=2';
    list.mockResolvedValue(pageOf([5, 4, 3], { page: 1, totalPages: 3, totalElements: 8 }));
    rerenderFeed();

    expect(await screen.findByText('Post 5')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not claim a page number on the first load or after a topic switch', async () => {
    search = 'topic=Gaming';
    list.mockReturnValue(new Promise(() => {}));
    renderFeed();

    expect(screen.getByRole('status', { name: 'Loading posts…' })).toBeInTheDocument();
    expect(screen.queryByText(/Loading page/)).not.toBeInTheDocument();
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

    expect(mockReplace).toHaveBeenCalledWith('/forum?topic=Science', {
      replace: true,
      preventScrollReset: true,
    });
  });

  it('removes the topic when All is selected but keeps unrelated parameters', async () => {
    search = 'topic=Science&utm=x';
    list.mockResolvedValue(pageOf([1]));
    renderFeed();
    await screen.findByText('Post 1');

    await userEvent.setup().click(screen.getByRole('button', { name: 'All' }));

    expect(mockReplace).toHaveBeenCalledWith('/forum?utm=x', {
      replace: true,
      preventScrollReset: true,
    });
  });
});

describe('ForumFeed – states', () => {
  it('shows an accessible loading state first', () => {
    list.mockReturnValue(new Promise(() => {}));
    renderFeed();

    const loading = screen.getByRole('status', { name: 'Loading posts…' });
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

  it('keeps the error and its button on screen while retrying, and asks the API again once', async () => {
    list.mockRejectedValueOnce(new Error('Network Error'));
    renderFeed();
    const alert = await screen.findByRole('alert');
    expect(list).toHaveBeenCalledTimes(1);

    list.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    const retry = within(alert).getByRole('button', { name: 'Try again' });
    await user.click(retry);

    // The same button, still focused, now saying the retry is running and announced politely.
    const running = await screen.findByRole('button', { name: 'Trying again…' });
    expect(running).toBe(retry);
    expect(running).toHaveFocus();
    expect(running).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Trying again…');
    expect(screen.queryByRole('status', { name: 'Loading posts…' })).not.toBeInTheDocument();

    await user.click(running);
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('keeps the error on screen while retrying a page that failed after a page change', async () => {
    list.mockResolvedValue(pageOf([8, 7, 6], { page: 0, totalPages: 3, totalElements: 8 }));
    const { rerenderFeed } = renderFeed();
    await screen.findByText('Post 8');

    search = 'page=2';
    list.mockRejectedValueOnce(new Error('Network Error'));
    rerenderFeed();
    const alert = await screen.findByRole('alert');

    list.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    const retry = within(alert).getByRole('button', { name: 'Try again' });
    await user.click(retry);

    const running = await screen.findByRole('button', { name: 'Trying again…' });
    expect(running).toBe(retry);
    expect(running).toHaveFocus();
    expect(screen.queryByText('Post 8')).not.toBeInTheDocument();
  });

  it('shows the loading state for a first load, not the retry state', async () => {
    list.mockReturnValue(new Promise(() => {}));
    renderFeed();

    expect(screen.getByRole('status', { name: 'Loading posts…' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the loaded posts and shows a notice when a background refresh fails', async () => {
    list.mockResolvedValue(pageOf([8, 7, 6], { page: 0, totalPages: 3, totalElements: 8 }));
    const { client } = renderFeed();
    await screen.findByText('Post 8');

    list.mockRejectedValue(new Error('Network Error'));
    await act(async () => {
      await client.refetchQueries({ queryKey: ['/forum/posts'] });
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load the posts');
    // The user keeps what they were reading and the controls.
    expect(postTitles()).toEqual(['Post 8', 'Post 7', 'Post 6']);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });
});

describe('ForumFeed – tags on the cards of the listing', () => {
  it('shows the tags a listed post carries, each a link to the feed of that tag', async () => {
    list.mockResolvedValue({
      ...pageOf([1, 2]),
      content: [
        makePost(1, {
          tags: [
            { id: 1, name: 'react', slug: 'react', postCount: 3 },
            { id: 2, name: 'Spring Boot', slug: 'spring-boot', postCount: 5 },
          ],
        }),
        makePost(2),
      ],
    });
    renderFeed();

    const cardOf = (title: string) =>
      within(screen.getByRole('heading', { name: title }).closest('article')!);
    await screen.findByRole('heading', { name: 'Post 1' });
    const first = cardOf('Post 1');
    expect(first.getByRole('link', { name: '#react' })).toHaveAttribute('href', '/forum?tag=react');
    expect(first.getByRole('link', { name: '#Spring Boot' })).toHaveAttribute(
      'href',
      '/forum?tag=spring-boot'
    );
    // The list is named "Tags", and a post without tags has no list at all.
    expect(first.getByRole('list', { name: 'Tags' })).toBeInTheDocument();
    expect(cardOf('Post 2').queryAllByRole('list')).toHaveLength(0);
  });
});

describe('ForumFeed – tag filter', () => {
  it('asks the API for the tag of the URL and says the feed is limited to it', async () => {
    search = 'tag=react';
    list.mockResolvedValue(pageOf([4, 3]));
    renderFeed();

    expect(await screen.findByText('Post 4')).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'react', page: 0 }),
      expect.objectContaining({ skipErrorToast: true, signal: expect.any(AbortSignal) })
    );
    expect(screen.getByText('#react')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Show all posts' })).toHaveAttribute('href', '/forum');
  });

  it('keeps the topic when the tag is cleared, and drops the page', async () => {
    search = 'topic=Gaming&tag=react&page=2';
    list.mockResolvedValue(pageOf([4, 3], { page: 1, totalPages: 2, totalElements: 12 }));
    renderFeed();

    await screen.findByText('Post 4');
    expect(screen.getByRole('link', { name: 'Show all posts' })).toHaveAttribute(
      'href',
      '/forum?topic=Gaming'
    );
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'react', categorySlug: 'gaming', page: 1 }),
      expect.anything()
    );
  });

  it('does not show the tag line without a tag', async () => {
    list.mockResolvedValue(pageOf([4]));
    renderFeed();
    await screen.findByText('Post 4');
    expect(screen.queryByText(/Posts tagged/)).not.toBeInTheDocument();
  });

  it('keeps the tag in the URL when the page changes', async () => {
    search = 'tag=react';
    list.mockResolvedValue(pageOf([8, 7, 6], { page: 0, totalPages: 3, totalElements: 8 }));
    renderFeed();
    await screen.findByText('Post 8');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Next' }));

    expect(mockPush).toHaveBeenCalledWith('/forum?tag=react&page=2');
  });

  it('keeps the tag in the URL when the topic changes', async () => {
    search = 'tag=react&page=2';
    list.mockResolvedValue(pageOf([4], { page: 1, totalPages: 2, totalElements: 12 }));
    renderFeed();
    await screen.findByText('Post 4');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Gaming' }));

    expect(mockReplace).toHaveBeenCalledWith('/forum?tag=react&topic=Gaming', {
      replace: true,
      preventScrollReset: true,
    });
  });

  it('says so for an unknown or empty tag instead of showing other posts', async () => {
    search = 'tag=no-such-tag';
    list.mockResolvedValue(pageOf([], { page: 0, totalPages: 0, totalElements: 0 }));
    renderFeed();

    expect(await screen.findByText('No posts with the tag #no-such-tag yet.')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Show all posts' })).toBeInTheDocument();
  });

  it('mentions the topic when the tag is combined with one', async () => {
    search = 'topic=Gaming&tag=react';
    list.mockResolvedValue(pageOf([], { page: 0, totalPages: 0, totalElements: 0 }));
    renderFeed();

    expect(
      await screen.findByText('No posts with the tag #react in this topic yet.')
    ).toBeInTheDocument();
  });

  it('shows the fixed error message and keeps the way back to all posts', async () => {
    search = 'tag=react';
    list.mockRejectedValue(new Error('SQL exploded at 10.0.0.5'));
    renderFeed();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load the posts. Please try again.');
    expect(alert).not.toHaveTextContent('SQL');
    expect(screen.getByRole('link', { name: 'Show all posts' })).toBeInTheDocument();
  });

  it('never shows the posts of one tag under another', async () => {
    search = 'tag=react';
    list.mockResolvedValueOnce(pageOf([8, 7]));
    const { rerenderFeed } = renderFeed();
    await screen.findByText('Post 8');

    search = 'tag=rust';
    list.mockReturnValueOnce(new Promise(() => {}));
    rerenderFeed();

    expect(await screen.findByRole('status', { name: 'Loading posts…' })).toBeInTheDocument();
    expect(screen.queryByText('Post 8')).not.toBeInTheDocument();
  });
});

describe('ForumFeed – analytics selection cache', () => {
  it.each([
    ['createdFrom=2026-10-01T00:00:00Z', 'createdFrom=2026-10-02T00:00:00Z'],
    ['createdTo=2026-10-02T00:00:00Z', 'createdTo=2026-10-03T00:00:00Z'],
    ['categoryId=1', 'categoryId=2'],
    ['', 'uncategorized=true'],
  ])('does not carry old posts from %s into %s', async (previous, next) => {
    search = previous;
    list.mockResolvedValueOnce(pageOf([8, 7]));
    const { rerenderFeed } = renderFeed();
    await screen.findByText('Post 8');
    search = next;
    list.mockReturnValueOnce(new Promise(() => {}));
    rerenderFeed();
    expect(await screen.findByRole('status', { name: 'Loading posts…' })).toBeInTheDocument();
    expect(screen.queryByText('Post 8')).not.toBeInTheDocument();
  });
});

describe('ForumFeed – the order from the home page', () => {
  it.each([
    ['new', 'createdAt'],
    ['top', 'voteScore'],
  ])('asks for the order of ?sort=%s (%s)', async (value, apiSort) => {
    list.mockResolvedValue(pageOf([1]));
    search = `sort=${value}`;
    renderFeed();

    await screen.findByText('Post 1');
    expect(list.mock.calls[0][0]).toEqual(expect.objectContaining({ sort: apiSort }));
  });

  it.each([null, 'nonsense', 'hot', 'lastActivityAt'])(
    "keeps the forum's own order for ?sort=%s",
    async (value) => {
      list.mockResolvedValue(pageOf([1]));
      search = value === null ? '' : `sort=${value}`;
      renderFeed();

      await screen.findByText('Post 1');
      // Without a usable order in the address the forum is what it was.
      expect(list.mock.calls[0][0]).toEqual(expect.objectContaining({ sort: 'lastActivityAt' }));
    }
  );

  it('says which order the feed is in, and offers the way back to the usual one', async () => {
    list.mockResolvedValue(pageOf([1]));
    search = 'topic=Gaming&sort=top&page=2';
    renderFeed();

    expect(await screen.findByText('The highest score first, of all time')).toBeInTheDocument();
    // The way back drops the order and the page and keeps the rest.
    expect(screen.getByRole('link', { name: 'Back to the usual order' })).toHaveAttribute(
      'href',
      '/forum?topic=Gaming'
    );
  });

  it.each([null, 'nonsense', 'hot'])('shows no order notice for ?sort=%s', async (value) => {
    list.mockResolvedValue(pageOf([1]));
    search = value === null ? '' : `sort=${value}`;
    renderFeed();

    await screen.findByText('Post 1');
    expect(screen.queryByText(/^Order:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to the usual order' })).toBeNull();
  });

  it('keeps the order in the address when the page changes', async () => {
    list.mockResolvedValue(pageOf([1], { totalPages: 2 }));
    search = 'sort=top';
    renderFeed();
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Next' }));
    expect(mockPush).toHaveBeenCalledWith('/forum?sort=top&page=2');
  });
});
