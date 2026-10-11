import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { CommentSection } from '../CommentSection';
import { apiClient } from '@/services/api';
import { useStore } from '@/store';
import type { Comment, PagedResponse, UserProfile } from '@/shared/types';

/**
 * CommentSection -> useComments -> commentService -> the real ApiClient.
 * Only the network is faked, so URLs, request bodies and error handling are covered.
 */

const LIST_URL = '/forum/posts/hello/comments';

const alice: UserProfile = {
  id: 1,
  username: 'alice',
  displayName: 'Alice',
  avatarUrl: null,
  bio: null,
  role: 'USER',
  status: 'ACTIVE',
  postCount: 0,
  commentCount: 0,
  createdAt: '2026-10-01T10:00:00Z',
};

function comment(id: number, overrides: Partial<Comment> = {}): Comment {
  return {
    id,
    postId: 10,
    parentId: null,
    content: `Comment ${id}`,
    status: 'VISIBLE',
    voteScore: 0,
    depth: 0,
    author: { id: 1, username: 'alice', displayName: 'Alice', avatarUrl: null, role: 'USER' },
    replies: [],
    createdAt: '2026-10-10T10:00:00Z',
    updatedAt: '2026-10-10T10:00:00Z',
    ...overrides,
  };
}

function pageOf(
  items: Comment[],
  { page = 0, totalElements = items.length, last = true } = {}
): PagedResponse<Comment> {
  return {
    content: items,
    page,
    size: 20,
    totalElements,
    totalPages: last ? page + 1 : page + 2,
    first: page === 0,
    last,
  };
}

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CommentSection slug="hello" />
    </QueryClientProvider>
  );
}

function signedIn(user: UserProfile = alice) {
  useStore.setState({ user, isAuthenticated: true, isInitialized: true });
}

beforeEach(() => {
  mock = new MockAdapter(axiosInstance);
  useStore.setState({ user: null, isAuthenticated: false, isInitialized: true });
});

afterEach(() => {
  mock.restore();
});

describe('CommentSection – reading', () => {
  it('requests the comments of the post by slug, 20 per page', async () => {
    mock.onGet(LIST_URL).reply(200, pageOf([comment(1)]));
    renderSection();

    await screen.findByText('Comment 1');
    expect(mock.history.get).toHaveLength(1);
    expect(mock.history.get[0].params).toEqual({ page: 0, size: 20 });
  });

  it('shows a loading message first', () => {
    mock.onGet(LIST_URL).reply(() => new Promise(() => {}));
    renderSection();

    expect(screen.getByText('Loading comments…')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    mock.onGet(LIST_URL).reply(200, pageOf([]));
    renderSection();

    expect(await screen.findByText('No comments yet. Be the first!')).toBeInTheDocument();
  });

  it('renders replies under their parent', async () => {
    mock
      .onGet(LIST_URL)
      .reply(200, pageOf([comment(1, { replies: [comment(2, { parentId: 1, depth: 1 })] })]));
    renderSection();

    expect(await screen.findByText('Comment 1')).toBeInTheDocument();
    expect(screen.getByText('Comment 2')).toBeInTheDocument();
  });

  it('counts threads, not all comments, because the count covers top-level comments only', async () => {
    mock.onGet(LIST_URL).reply(200, pageOf([comment(1)], { totalElements: 1 }));
    const { unmount } = renderSection();
    expect(await screen.findByRole('heading', { name: 'Comments (1 thread)' })).toBeInTheDocument();
    unmount();

    mock.reset();
    mock.onGet(LIST_URL).reply(200, pageOf([comment(1), comment(2)], { totalElements: 5 }));
    renderSection();
    expect(
      await screen.findByRole('heading', { name: 'Comments (5 threads)' })
    ).toBeInTheDocument();
  });

  it('shows a fixed error when loading fails, without server details', async () => {
    mock.onGet(LIST_URL).reply(500, { status: 500, detail: 'PSQLException at com.devpulse' });
    renderSection();

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load comments.');
    expect(document.body).not.toHaveTextContent('PSQLException');
  });

  it('loads the next page and appends it', async () => {
    mock
      .onGet(LIST_URL)
      .reply((config) =>
        config.params.page === 0
          ? [200, pageOf([comment(1)], { totalElements: 2, last: false })]
          : [200, pageOf([comment(2)], { page: 1, totalElements: 2, last: true })]
      );
    renderSection();
    await screen.findByText('Comment 1');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Load more comments' }));

    expect(await screen.findByText('Comment 2')).toBeInTheDocument();
    expect(screen.getByText('Comment 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more comments' })).not.toBeInTheDocument();
  });
});

describe('CommentSection – guests', () => {
  it('offers to sign in and shows no form or action buttons', async () => {
    mock.onGet(LIST_URL).reply(200, pageOf([comment(1)]));
    renderSection();

    await screen.findByText('Comment 1');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByLabelText('Add a comment')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reply' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});

describe('CommentSection – while the session is being restored', () => {
  it('shows neither the sign-in prompt nor the form until we know who the user is', async () => {
    useStore.setState({ user: null, isAuthenticated: false, isInitialized: false });
    mock.onGet(LIST_URL).reply(200, pageOf([comment(1)]));
    renderSection();

    await screen.findByText('Comment 1');
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Add a comment')).not.toBeInTheDocument();
  });

  it('then shows the form for a restored session, without ever showing the prompt', async () => {
    useStore.setState({ user: null, isAuthenticated: false, isInitialized: false });
    mock.onGet(LIST_URL).reply(200, pageOf([comment(1)]));
    renderSection();
    await screen.findByText('Comment 1');

    act(() => useStore.getState().setAuth(alice, 'token'));

    expect(await screen.findByLabelText('Add a comment')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('shows the sign-in prompt once the restore found no session', async () => {
    useStore.setState({ user: null, isAuthenticated: false, isInitialized: false });
    mock.onGet(LIST_URL).reply(200, pageOf([comment(1)]));
    renderSection();
    await screen.findByText('Comment 1');

    act(() => useStore.getState().setInitialized());

    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });
});

describe('CommentSection – signed in', () => {
  beforeEach(() => signedIn());

  it('posts a comment with only its content and shows the refreshed list', async () => {
    let created = false;
    mock
      .onGet(LIST_URL)
      .reply(() => [200, pageOf(created ? [comment(1), comment(2)] : [comment(1)])]);
    mock.onPost(LIST_URL).reply(() => {
      created = true;
      return [201, comment(2)];
    });
    renderSection();
    await screen.findByText('Comment 1');
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Add a comment'), '  A new comment  ');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(await screen.findByText('Comment 2')).toBeInTheDocument();
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ content: 'A new comment' });
    expect(screen.getByLabelText('Add a comment')).toHaveValue('');
  });

  it('replies with the id of the parent', async () => {
    mock.onGet(LIST_URL).reply(200, pageOf([comment(7)]));
    mock.onPost(LIST_URL).reply(201, comment(8, { parentId: 7, depth: 1 }));
    renderSection();
    await screen.findByText('Comment 7');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Reply' }));
    await user.type(screen.getByLabelText('Reply to Alice'), 'A reply');
    await user.click(screen.getByRole('button', { name: 'Post reply' }));

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ content: 'A reply', parentId: 7 });
  });

  it('shows the server message when posting fails (for example the depth limit)', async () => {
    mock.onGet(LIST_URL).reply(200, pageOf([comment(1)]));
    mock
      .onPost(LIST_URL)
      .reply(422, { status: 422, detail: 'Maximum comment nesting depth (5) exceeded' });
    renderSection();
    await screen.findByText('Comment 1');
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Add a comment'), 'Too deep');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Maximum comment nesting depth (5) exceeded'
    );
    expect(screen.getByLabelText('Add a comment')).toHaveValue('Too deep');
  });

  it('shows a fixed message for a server error, never its text', async () => {
    mock.onGet(LIST_URL).reply(200, pageOf([comment(1)]));
    mock.onPost(LIST_URL).reply(500, { status: 500, detail: 'PSQLException at com.devpulse' });
    renderSection();
    await screen.findByText('Comment 1');
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Add a comment'), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.'
    );
    expect(document.body).not.toHaveTextContent('PSQLException');
  });

  it('shows the same fixed message for a network failure when deleting', async () => {
    mock.onGet(LIST_URL).reply(200, pageOf([comment(1)]));
    mock.onDelete('/forum/comments/1').networkError();
    renderSection();
    await screen.findByText('Comment 1');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.'
    );
    expect(document.body).not.toHaveTextContent('Network Error');
  });

  it('deletes an own comment by id, and offers delete only for comments the user may delete', async () => {
    const bobs = comment(2, {
      author: { id: 2, username: 'bob', displayName: 'Bob', avatarUrl: null, role: 'USER' },
    });
    let deleted = false;
    mock.onGet(LIST_URL).reply(() => [200, pageOf(deleted ? [bobs] : [comment(1), bobs])]);
    mock.onDelete('/forum/comments/1').reply(() => {
      deleted = true;
      return [204];
    });
    renderSection();
    await screen.findByText('Comment 1');

    // One Delete button: Alice's own comment. Bob's comment has none.
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    expect(deleteButtons).toHaveLength(1);
    await userEvent.setup().click(deleteButtons[0]);

    await waitFor(() => expect(screen.queryByText('Comment 1')).not.toBeInTheDocument());
    expect(screen.getByText('Comment 2')).toBeInTheDocument();
    expect(mock.history.delete).toHaveLength(1);
  });

  it('lets a moderator delete anyone’s comment', async () => {
    signedIn({ ...alice, id: 9, username: 'mod', displayName: 'Mod', role: 'MODERATOR' });
    mock.onGet(LIST_URL).reply(200, pageOf([comment(1)]));
    renderSection();
    await screen.findByText('Comment 1');

    expect(
      within(screen.getByRole('list')).getByRole('button', { name: 'Delete' })
    ).toBeInTheDocument();
  });
});
