import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { StrictMode } from 'react';
import { vi } from 'vitest';
import type * as OpeningConst from '@/shared/api/forum/postOpening.const';
import PostPage from '@/pages/post/ui/PostPage';
import { apiClient } from '@/shared/api/client/api';
import type { PostDto } from '@/shared/api/generated/models/postDto.dto';
import { getGetPostQueryKey } from '@/shared/api/generated/orbita.api';
import { toast } from '@/shared/lib/toast';
import { useStore } from '@/store';
import { signInUser } from '@/test/session';

/**
 * PostPage -> the opening hook -> the generated operation -> the real ApiClient (CSRF, interceptors).
 * Only the network is faked. What is counted is what reaches `POST /forum/posts/{slug}/openings`.
 */

let slug = 'hello';
let hash = '';

vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({
    useParams: () => ({ slug }),
    useLocation: () => ({ pathname: `/forum/${slug}`, search: '', hash, state: null, key: 'test' }),
    useNavigate: () => vi.fn(),
  })
);
vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
// The waits between retries are real time otherwise; the number of retries is the real one.
vi.mock('@/shared/api/forum/postOpening.const', async (importOriginal) => ({
  ...(await importOriginal<typeof OpeningConst>()),
  OPENING_RETRY_DELAYS_MS: [0, 0],
}));

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

const POST: PostDto = {
  id: 5,
  slug: 'hello',
  title: 'Hello thread',
  content: 'First line',
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
  commentCount: 0,
  createdAt: '2026-11-18T10:00:00Z',
  updatedAt: '2026-11-18T10:00:00Z',
  lastActivityAt: '2026-11-18T10:00:00Z',
  myVote: null,
  pinned: false,
  status: 'PUBLISHED',
  subscribed: false,
  tags: [],
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

function renderPage({ member = false, strict = false } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (member) signInUser(client, { ...POST.author, status: 'ACTIVE' });
  // A new element each time: React skips the re-render of an element it has already rendered.
  const tree = () => (
    <QueryClientProvider client={client}>
      <PostPage />
    </QueryClientProvider>
  );
  const view = render(strict ? <StrictMode>{tree()}</StrictMode> : tree());
  return { client, ...view, rerenderPage: () => view.rerender(tree()) };
}

const openings = () =>
  mock.history.post.filter((request) => /\/forum\/posts\/[^/]+\/openings$/.test(request.url ?? ''));
const openingIds = () => openings().map((request) => JSON.parse(request.data).openingId as string);
const reading = () => screen.findByRole('heading', { level: 1, name: 'Hello thread' });
/** Time for anything that would have been sent: the requests of this test are all in-memory. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 60)));

/** The post and its comments; the opening is accepted unless the test says otherwise. */
function servePost(post: Partial<PostDto> = {}, { acceptOpening = true } = {}) {
  mock.onGet('/forum/posts/hello').reply(200, { ...POST, ...post });
  mock.onGet('/forum/posts/hello/comments').reply(200, EMPTY_COMMENTS);
  if (acceptOpening) mock.onPost('/forum/posts/hello/openings').reply(204);
}

beforeEach(() => {
  vi.clearAllMocks();
  slug = 'hello';
  hash = '';
  // jsdom does not scroll; the #comments link does.
  Element.prototype.scrollIntoView = vi.fn();
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  const summary = {
    postId: 5,
    viewCount: 10,
    commentCount: 0,
    voteScore: 3,
    collectedFrom: '2026-11-01T00:00:00Z',
    upvoteCount: 3,
    downvoteCount: 0,
  };
  mock.onGet('/analytics/public/posts/5').reply(200, summary);
  mock.onGet('/analytics/me/posts/5').reply(200, summary);
  // The author's daily openings are not what is tested here.
  mock.onGet(/\/analytics\/me\/posts\/5\/openings/).reply(500);
  useStore.setState({ isAuthenticated: false, isInitialized: true });
});

afterEach(() => mock.restore());

describe('recording the opening of a post', () => {
  it.each([
    ['a guest', false],
    ['a member', true],
  ])('records one opening for %s once the post is on screen', async (_who, member) => {
    servePost();
    renderPage({ member });

    await reading();
    await waitFor(() => expect(openings()).toHaveLength(1));
    await settle();

    expect(openings()).toHaveLength(1);
    expect(openings()[0].url).toBe('/forum/posts/hello/openings');
    expect(openingIds()[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    // Only the opening id: nothing that names the reader.
    expect(Object.keys(JSON.parse(openings()[0].data))).toEqual(['openingId']);
  });

  it('records nothing before the post is shown', async () => {
    let finish: () => void = () => {};
    mock.onGet('/forum/posts/hello/comments').reply(200, EMPTY_COMMENTS);
    mock.onPost('/forum/posts/hello/openings').reply(204);
    mock
      .onGet('/forum/posts/hello')
      .reply(() => new Promise((resolve) => (finish = () => resolve([200, POST]))));
    renderPage();

    await settle();
    expect(openings()).toHaveLength(0);

    await act(async () => finish());
    await reading();
    await waitFor(() => expect(openings()).toHaveLength(1));
  });

  it.each([
    ['a post that failed to load', 500],
    ['a post that does not exist', 404],
  ])('records nothing for %s', async (_what, status) => {
    mock.onGet('/forum/posts/hello').reply(status, { detail: 'x' });
    renderPage();

    await waitFor(() =>
      expect(mock.history.get.some((request) => request.url === '/forum/posts/hello')).toBe(true)
    );
    await settle();
    expect(screen.queryByRole('heading', { level: 1, name: 'Hello thread' })).toBeNull();
    await settle();

    expect(openings()).toHaveLength(0);
  });

  it('counts a re-render, a window focus, a refetch and a #comments link on the page as nothing', async () => {
    servePost();
    const { client, rerenderPage } = renderPage();
    await reading();
    await waitFor(() => expect(openings()).toHaveLength(1));

    rerenderPage();
    fireEvent(window, new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    await act(async () => {
      await client.invalidateQueries({ queryKey: getGetPostQueryKey('hello') });
    });
    hash = '#comments';
    rerenderPage();
    await settle();

    expect(mock.history.get.filter((request) => request.url === '/forum/posts/hello').length).toBe(
      2
    );
    expect(openings()).toHaveLength(1);
  });

  it('counts showing, hiding and reopening author analytics as nothing', async () => {
    servePost();
    renderPage({ member: true });
    await reading();
    await waitFor(() => expect(openings()).toHaveLength(1));

    const analytics = await screen.findByRole('button', { name: 'Analytics' });
    fireEvent.click(analytics);
    await waitFor(() =>
      expect(mock.history.get.some((request) => request.url === '/analytics/me/posts/5')).toBe(true)
    );
    fireEvent.click(analytics);
    fireEvent.click(analytics);
    await waitFor(() =>
      expect(
        mock.history.get.filter((request) => request.url === '/analytics/me/posts/5').length
      ).toBeGreaterThan(1)
    );
    await settle();

    expect(openings()).toHaveLength(1);
  });

  it('records once under React StrictMode, which runs effects twice in development', async () => {
    servePost();
    renderPage({ strict: true });

    await reading();
    await waitFor(() => expect(openings()).toHaveLength(1));
    await settle();

    expect(openings()).toHaveLength(1);
  });

  it('records the page opened again (a reload, a navigation, Back) as another opening with its own id', async () => {
    servePost();
    const first = renderPage();
    await reading();
    await waitFor(() => expect(openings()).toHaveLength(1));
    first.unmount();

    renderPage();
    await reading();
    await waitFor(() => expect(openings()).toHaveLength(2));

    expect(new Set(openingIds()).size).toBe(2);
  });

  it('records another post shown on the same page, and the first one again when it comes back', async () => {
    servePost();
    mock.onGet('/forum/posts/other').reply(200, { ...POST, id: 6, slug: 'other', title: 'Other' });
    mock.onGet('/forum/posts/other/comments').reply(200, EMPTY_COMMENTS);
    mock.onPost('/forum/posts/other/openings').reply(204);
    const { rerenderPage } = renderPage();
    await reading();
    await waitFor(() => expect(openings()).toHaveLength(1));

    slug = 'other';
    rerenderPage();
    await screen.findByRole('heading', { level: 1, name: 'Other' });
    await waitFor(() => expect(openings()).toHaveLength(2));
    slug = 'hello';
    rerenderPage();
    await reading();
    await waitFor(() => expect(openings()).toHaveLength(3));

    expect(openings().map((request) => request.url)).toEqual([
      '/forum/posts/hello/openings',
      '/forum/posts/other/openings',
      '/forum/posts/hello/openings',
    ]);
    expect(new Set(openingIds()).size).toBe(3);
  });
});

describe('when recording does not work', () => {
  it('lets the post be read, with no toast and no message, when the recording is refused', async () => {
    servePost({}, { acceptOpening: false });
    mock.onPost('/forum/posts/hello/openings').reply(500, { detail: 'PSQLException' });
    renderPage();

    expect(await reading()).toBeInTheDocument();
    await waitFor(() => expect(openings().length).toBeGreaterThan(1));
    await settle();

    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('PSQLException');
    expect(screen.getByText('First line')).toBeInTheDocument();
  });

  it('tries a failed opening again with the same id, and stops once it is counted', async () => {
    servePost({}, { acceptOpening: false });
    // A server error, then a dropped connection, then it is delivered.
    mock
      .onPost('/forum/posts/hello/openings')
      .replyOnce(503)
      .onPost('/forum/posts/hello/openings')
      .networkErrorOnce()
      .onPost('/forum/posts/hello/openings')
      .replyOnce(204);
    renderPage();

    await reading();
    await waitFor(() => expect(openings()).toHaveLength(3));
    await settle();

    // Three tries, one id.
    expect(openings()).toHaveLength(3);
    expect(new Set(openingIds()).size).toBe(1);
  });

  it('gives up after the retries, still with the one id', async () => {
    servePost({}, { acceptOpening: false });
    mock.onPost('/forum/posts/hello/openings').reply(503);
    renderPage();

    await reading();
    await waitFor(() => expect(openings()).toHaveLength(3));
    await settle();

    expect(openings()).toHaveLength(3);
    expect(new Set(openingIds()).size).toBe(1);
  });

  it.each([400, 404])('does not try again after a %i, which will not change', async (status) => {
    servePost();
    mock.onPost('/forum/posts/hello/openings').reply(status);
    renderPage();

    await reading();
    await waitFor(() => expect(openings()).toHaveLength(1));
    await settle();

    expect(openings()).toHaveLength(1);
  });
});
