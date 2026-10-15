import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import HomeFeed from '../HomeFeed';
import { ACTION_UNAVAILABLE_HINT } from '@/app/(main)/_ui/postCard.const';
import { FEED_ERROR_MESSAGE } from '@/app/(main)/_ui/forumFeed.const';
import { postService, voteService } from '@/shared/api/forum/forumClient';
import { FEED_PAGE_SIZE, FEED_QUERY_KEY, FEED_SORT } from '@/shared/api/forum/feedQuery.const';
import { useStore } from '@/store';
import type { PagedResponse } from '@/shared/api/client/pagination.dto';
import type { PostSummary } from '@/shared/api/forum/post.dto';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/shared/api/forum/forumClient', () => ({
  postService: { list: vi.fn() },
  voteService: { cast: vi.fn(), retract: vi.fn() },
}));

const list = vi.mocked(postService.list);

function makePost(id: number): PostSummary {
  return {
    id,
    title: `Post ${id}`,
    slug: `post-${id}`,
    status: 'PUBLISHED',
    pinned: false,
    viewCount: 0,
    voteScore: 3,
    myVote: null,
    commentCount: 2,
    category: null,
    author: { id: 1, username: 'alice', displayName: null, avatarUrl: null, role: 'USER' },
    lastActivityAt: '2026-10-10T10:00:00Z',
    createdAt: '2026-10-10T10:00:00Z',
  };
}

function pageOf(ids: number[], totalPages = 1): PagedResponse<PostSummary> {
  return {
    content: ids.map(makePost),
    page: 0,
    size: FEED_PAGE_SIZE,
    totalElements: ids.length,
    totalPages,
    first: true,
    last: totalPages <= 1,
  };
}

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <HomeFeed />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState({ user: null, isAuthenticated: false, isInitialized: true });
});

describe('HomeFeed', () => {
  it('requests the first page of real posts from the API', async () => {
    list.mockResolvedValue(pageOf([2, 1]));
    renderHome();

    expect(await screen.findByText('Post 2')).toBeInTheDocument();
    expect(screen.getByText('Post 1')).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith(
      { page: 0, size: FEED_PAGE_SIZE, sort: FEED_SORT, categorySlug: undefined },
      { skipErrorToast: true }
    );
  });

  it('shows a loading state until the posts arrive', async () => {
    list.mockReturnValue(new Promise(() => {}));
    renderHome();

    expect(screen.getByRole('status', { name: 'Loading posts…' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no posts', async () => {
    list.mockResolvedValue(pageOf([]));
    renderHome();

    expect(await screen.findByText('No posts yet.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows a fixed error message with a retry that loads the posts', async () => {
    list.mockRejectedValueOnce(new Error('boom: internal details'));
    list.mockResolvedValueOnce(pageOf([1]));
    renderHome();

    expect(await screen.findByRole('alert')).toHaveTextContent(FEED_ERROR_MESSAGE);
    expect(screen.queryByText(/internal details/)).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Post 1')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not claim there are no posts when a refresh of an empty page fails', async () => {
    list.mockResolvedValueOnce(pageOf([]));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <HomeFeed />
      </QueryClientProvider>
    );
    expect(await screen.findByText('No posts yet.')).toBeInTheDocument();

    list.mockRejectedValueOnce(new Error('down'));
    await act(async () => {
      await client.refetchQueries({ queryKey: FEED_QUERY_KEY });
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(FEED_ERROR_MESSAGE);
    expect(screen.queryByText('No posts yet.')).not.toBeInTheDocument();
  });

  it('links to the forum when there are more posts than fit on the page', async () => {
    list.mockResolvedValue(pageOf([1], 3));
    renderHome();

    const link = await screen.findByRole('link', { name: /See all posts/ });
    expect(link).toHaveAttribute('href', '/forum');
  });

  it('has no link to the forum when everything is already shown', async () => {
    list.mockResolvedValue(pageOf([1], 1));
    renderHome();

    await screen.findByText('Post 1');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps share, save and comments disabled on real posts', async () => {
    list.mockResolvedValue(pageOf([1]));
    renderHome();

    await screen.findByText('Post 1');
    for (const name of ['2 Comments', 'Share', 'Save']) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', ACTION_UNAVAILABLE_HINT);
    }
  });

  it('sends a vote through the API from the home page', async () => {
    useStore.setState({ user: { id: 1 } as never, isAuthenticated: true, isInitialized: true });
    list.mockResolvedValue(pageOf([1]));
    vi.mocked(voteService.cast).mockResolvedValue({
      id: 9,
      entityType: 'POST',
      entityId: 1,
      voteType: 'UP',
      newScore: 4,
    } as never);
    renderHome();
    await screen.findByText('Post 1');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Upvote' }));

    await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument());
    expect(voteService.cast).toHaveBeenCalledWith(
      { entityType: 'POST', entityId: 1, voteType: 'UP' },
      expect.anything()
    );
  });
});
