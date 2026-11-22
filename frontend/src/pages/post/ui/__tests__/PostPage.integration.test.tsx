import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import PostPage from '@/pages/post/ui/PostPage';
import { apiClient } from '@/shared/api/client/api';
import type { PostDto } from '@/shared/api/generated/models/postDto.dto';
import { toast } from '@/shared/lib/toast';
import { useStore } from '@/store';

/**
 * PostPage -> hooks -> generated operations -> the real ApiClient (axios, CSRF, interceptors).
 * Only the network is faked, and answers as the API documents.
 */

let slug = 'hello';
let hash = '';
const navigate = vi.fn();

vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({
    useParams: () => ({ slug }),
    useLocation: () => ({ pathname: `/forum/${slug}`, search: '', hash, state: null, key: 'test' }),
    useNavigate: () => navigate,
  })
);
vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

const POST: PostDto = {
  id: 5,
  slug: 'hello',
  title: 'Hello thread',
  content: 'First line\nSecond line',
  author: { id: 1, username: 'alice', displayName: 'Alice A.', avatarUrl: null, role: 'USER' },
  category: {
    id: 2,
    name: 'Gaming',
    slug: 'gaming',
    description: null,
    displayOrder: 1,
    visible: true,
    createdAt: '2026-10-01T10:00:00Z',
  },
  commentCount: 4,
  createdAt: '2026-11-18T10:00:00Z',
  updatedAt: '2026-11-18T10:00:00Z',
  lastActivityAt: '2026-11-18T10:00:00Z',
  myVote: null,
  pinned: false,
  status: 'PUBLISHED',
  subscribed: false,
  tags: [{ id: 1, name: 'react', slug: 'react', postCount: 3 }],
  viewCount: 10,
  voteScore: 3,
};

const EMPTY_COMMENTS = {
  content: [],
  first: true,
  last: true,
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <PostPage />
      </QueryClientProvider>
    ),
  };
}

function servePost(post: Partial<PostDto> = {}) {
  mock.onGet('/forum/posts/hello').reply(200, { ...POST, ...post });
  mock.onGet('/forum/posts/hello/comments').reply(200, EMPTY_COMMENTS);
}

beforeEach(() => {
  vi.clearAllMocks();
  slug = 'hello';
  hash = '';
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  useStore.setState({ isAuthenticated: false, isInitialized: true });
});

afterEach(() => mock.restore());

describe('showing the post', () => {
  it('shows a loading state first', () => {
    mock.onGet('/forum/posts/hello').reply(() => new Promise(() => {}));
    renderPage();

    expect(screen.getByRole('status', { name: 'Loading the post' })).toBeInTheDocument();
  });

  it('shows the real post: title, author, time, category, tags, text and counts', async () => {
    servePost();
    renderPage();

    const article = await screen.findByRole('article', { name: 'Hello thread' });
    expect(
      within(article).getByRole('heading', { level: 1, name: 'Hello thread' })
    ).toBeInTheDocument();
    expect(within(article).getByText('Alice A.')).toBeInTheDocument();
    expect(within(article).getByRole('link', { name: 'Gaming' })).toHaveAttribute(
      'href',
      '/forum?topic=Gaming'
    );
    expect(within(article).getByRole('link', { name: '#react' })).toBeInTheDocument();
    expect(within(article).getByText(/First line/)).toBeInTheDocument();
    expect(within(article).getByText('3')).toBeInTheDocument();
    expect(within(article).getByRole('link', { name: '4 Comments' })).toHaveAttribute(
      'href',
      '#comments'
    );
    expect(within(article).getByText(/•/)).toHaveAttribute('datetime', '2026-11-18T10:00:00Z');
    expect(mock.history.get.find((request) => request.url === '/forum/posts/hello')).toBeDefined();
  });

  it('shows the Markdown body as formatted text, under the one h1 of the page', async () => {
    servePost({
      content:
        '# Big heading\n\nSome **bold** text and a [link](https://example.com/x).\n\n- a\n- b',
    });
    renderPage();

    const article = await screen.findByRole('article', { name: 'Hello thread' });
    expect(within(article).getByText('bold').tagName).toBe('STRONG');
    expect(within(article).getByRole('link', { name: 'link' })).toHaveAttribute(
      'href',
      'https://example.com/x'
    );
    // The two items of the body's list (the tags are a list too, so they are named).
    expect(within(article).getByText('a', { selector: 'li' })).toBeInTheDocument();
    expect(within(article).getByText('b', { selector: 'li' })).toBeInTheDocument();
    // The author's "#" is a lower heading: the title stays the only h1.
    expect(within(article).getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(within(article).getByRole('heading', { level: 2, name: 'Big heading' })).toBeVisible();
  });

  it('shows a hostile body as inert text: no script, no handler, no image, no javascript link', async () => {
    servePost({
      content: [
        '<img src=x onerror=alert(1)> <b>bold</b>',
        '<script>alert(1)</script>',
        '[x](javascript:alert(1))',
        '![pixel](https://tracker.example/p.png)',
      ].join('\n\n'),
    });
    const { container } = renderPage();

    await screen.findByRole('article');
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('article img')).toBeNull();
    expect(container.querySelector('article b')).toBeNull();
    expect(container.innerHTML).not.toMatch(/onerror|javascript:/i);
    // The image is offered as a link, not loaded.
    expect(screen.getByRole('link', { name: 'Image: pixel' })).toBeInTheDocument();
  });

  it('shows a category that is not a known topic as plain text, and a post without one', async () => {
    servePost({ category: { ...POST.category!, name: 'Chess club', slug: 'chess' } });
    const { unmount } = renderPage();
    const article = await screen.findByRole('article');
    expect(within(article).getByText('Chess club').closest('a')).toBeNull();
    unmount();

    mock.reset();
    mock.onGet('/forum/posts/hello').reply(200, { ...POST, category: null, tags: [] });
    mock.onGet('/forum/posts/hello/comments').reply(200, EMPTY_COMMENTS);
    renderPage();
    const bare = await screen.findByRole('article');
    expect(within(bare).queryByText('Gaming')).not.toBeInTheDocument();
    expect(within(bare).queryByRole('list', { name: 'Tags' })).not.toBeInTheDocument();
  });

  it('names a pinned and a locked post', async () => {
    servePost({ pinned: true, status: 'LOCKED' });
    renderPage();

    const article = await screen.findByRole('article');
    expect(within(article).getByText('pinned')).toBeInTheDocument();
    expect(within(article).getByText('locked')).toBeInTheDocument();
  });

  it.each([
    [0, '0 Comments'],
    [1, '1 Comment'],
    [7, '7 Comments'],
  ])('writes %i comments as "%s", as the feed card does', async (commentCount, label) => {
    servePost({ commentCount });
    renderPage();

    const article = await screen.findByRole('article', { name: 'Hello thread' });
    expect(within(article).getByRole('link', { name: label })).toHaveAttribute('href', '#comments');
  });

  it('keeps share and save disabled with a reason, as in the feed', async () => {
    servePost();
    renderPage();

    const article = await screen.findByRole('article');
    for (const name of ['Share', 'Save']) {
      const button = within(article).getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'Not available yet');
    }
  });

  it('shows the comments of the post below it, at the anchor the comment links point to', async () => {
    servePost();
    const { container } = renderPage();

    expect(await screen.findByRole('heading', { name: /Comments/ })).toBeInTheDocument();
    expect(container.querySelector('#comments')).not.toBeNull();
    expect(mock.history.get.some((request) => request.url === '/forum/posts/hello/comments')).toBe(
      true
    );
  });
});

describe('when there is no post to show', () => {
  it('says so for a post that does not exist, and offers the way back', async () => {
    mock.onGet('/forum/posts/hello').reply(404, { status: 404 });
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the forum' })).toHaveAttribute(
      'href',
      '/forum'
    );
    // No comments are asked for a post that is not there.
    expect(mock.history.get.some((request) => request.url?.endsWith('/comments'))).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('says so, and asks for nothing, when the address has no slug', () => {
    slug = '';
    renderPage();

    expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
    expect(mock.history.get).toHaveLength(0);
  });

  it('shows a fixed message and a retry for a failure, never the server text or a toast', async () => {
    mock.onGet('/forum/posts/hello').replyOnce(500, { detail: 'PSQLException at db:5432' });
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load this post. Please try again.');
    expect(document.body).not.toHaveTextContent('PSQLException');
    expect(toast.error).not.toHaveBeenCalled();

    servePost();
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('article', { name: 'Hello thread' })).toBeInTheDocument();
  });

  it('keeps a loaded post on screen when a later refresh fails', async () => {
    servePost();
    const { client } = renderPage();
    await screen.findByRole('article');

    mock.onGet('/forum/posts/hello').reply(500);
    await client.invalidateQueries({ queryKey: ['/forum/posts/hello'] });

    await waitFor(() =>
      expect(
        mock.history.get.filter((request) => request.url === '/forum/posts/hello').length
      ).toBeGreaterThan(1)
    );
    expect(screen.getByRole('article', { name: 'Hello thread' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('voting on the post page', () => {
  it('sends a guest to sign in instead of voting', async () => {
    servePost();
    renderPage();
    await screen.findByRole('article');

    await userEvent.click(screen.getByRole('button', { name: 'Upvote' }));

    expect(navigate).toHaveBeenCalledWith('/login');
    expect(mock.history.post).toHaveLength(0);
  });

  it('shows the score the server answers with, on this page', async () => {
    useStore.setState({ isAuthenticated: true, isInitialized: true });
    servePost();
    mock.onPost('/forum/votes').reply(201, {
      id: 9,
      entityType: 'POST',
      entityId: 5,
      voteType: 'UP',
      newScore: 4,
    });
    renderPage();
    await screen.findByRole('article');

    await userEvent.click(screen.getByRole('button', { name: 'Upvote' }));

    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      entityType: 'POST',
      entityId: 5,
      voteType: 'UP',
    });
    expect(screen.getByRole('button', { name: 'Upvote' })).toHaveClass('text-accent');
  });

  it('takes the vote back, and shows the score the server confirms', async () => {
    useStore.setState({ isAuthenticated: true, isInitialized: true });
    mock
      .onGet('/forum/posts/hello')
      .replyOnce(200, { ...POST, voteScore: 4, myVote: { id: 9, voteType: 'UP' } });
    mock.onGet('/forum/posts/hello').reply(200, { ...POST, voteScore: 3, myVote: null });
    mock.onGet('/forum/posts/hello/comments').reply(200, EMPTY_COMMENTS);
    mock.onDelete('/forum/votes/9').reply(204);
    renderPage();
    await screen.findByText('4');

    await userEvent.click(screen.getByRole('button', { name: 'Upvote' }));

    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upvote' })).not.toHaveClass('text-accent');
  });
});

describe('the comments anchor', () => {
  it('scrolls to the comments once the post has loaded, when the address points at them', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    hash = '#comments';
    servePost();
    renderPage();

    await screen.findByRole('article');

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(scrollIntoView.mock.instances[0]).toBe(document.getElementById('comments'));
  });

  it('does not scroll when the address has no anchor', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    servePost();
    renderPage();

    await screen.findByRole('article');

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('links the comment count without adding a history entry per click', async () => {
    servePost();
    renderPage();

    const link = await screen.findByRole('link', { name: '4 Comments' });

    expect(link).toHaveAttribute('href', '#comments');
  });
});

describe('the post changing under the reader', () => {
  it('shows "not found" when a refresh says the post is gone', async () => {
    servePost();
    const { client } = renderPage();
    await screen.findByRole('article');

    mock.onGet('/forum/posts/hello').reply(404, { status: 404 });
    await client.invalidateQueries({ queryKey: ['/forum/posts/hello'] });

    expect(await screen.findByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('shows the new comment count after the user comments', async () => {
    useStore.setState({
      isAuthenticated: true,
      isInitialized: true,
    });
    mock.onGet('/forum/posts/hello').replyOnce(200, POST);
    mock.onGet('/forum/posts/hello').reply(200, { ...POST, commentCount: 5 });
    mock.onGet('/forum/posts/hello/comments').reply(200, EMPTY_COMMENTS);
    mock.onPost('/forum/posts/hello/comments').reply(201, { id: 1, content: 'Nice' });
    renderPage();
    await screen.findByRole('link', { name: '4 Comments' });

    await userEvent.type(screen.getByLabelText('Add a comment'), 'Nice');
    await userEvent.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(await screen.findByRole('link', { name: '5 Comments' })).toBeInTheDocument();
  });
});
