import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { vi } from 'vitest';
import { PostVoteColumn } from '../PostVoteColumn';
import type { PagedResponse } from '@/shared/api/client/pagination.dto';
import { voteService } from '@/shared/api/forum/forumClient';
import type { PostSummary } from '@/shared/api/forum/post.dto';
import {
  VOTE_CONFLICT_MESSAGE,
  VOTE_ERROR_MESSAGE,
  VOTE_GONE_MESSAGE,
  VOTE_LOCKED_MESSAGE,
} from '@/shared/api/forum/vote.const';
import type { MyVote } from '@/shared/api/forum/vote.dto';
import { toast } from '@/shared/lib/toast';
import { useStore } from '@/store';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/shared/lib/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/shared/api/forum/forumClient', () => ({
  voteService: { cast: vi.fn(), retract: vi.fn() },
}));

const FEED_KEY = ['forum-posts', { page: 0, categorySlug: undefined }];

function feed(voteScore: number, myVote: MyVote | null): PagedResponse<PostSummary> {
  return {
    content: [
      { id: 1, voteScore, myVote } as PostSummary,
      { id: 2, voteScore: 50, myVote: null } as PostSummary,
    ],
    page: 0,
    size: 10,
    totalElements: 2,
    totalPages: 1,
    first: true,
    last: true,
  };
}

function httpError(status: number) {
  return new AxiosError('failed', 'ERR', undefined, undefined, { status, data: {} } as never);
}

function vote(id: number, voteType: 'UP' | 'DOWN', newScore: number) {
  return { id, entityType: 'POST', entityId: 1, voteType, newScore, createdAt: 'x' } as const;
}

function setup(score: number, myVote: MyVote | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(FEED_KEY, feed(score, myVote));
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const view = render(
    <QueryClientProvider client={queryClient}>
      <PostVoteColumn postId={1} score={score} myVote={myVote} />
    </QueryClientProvider>
  );
  return { queryClient, invalidate, user: userEvent.setup(), ...view };
}

const cached = (queryClient: QueryClient) =>
  queryClient.getQueryData<PagedResponse<PostSummary>>(FEED_KEY)!.content;

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState({ user: { id: 7 } as never, isAuthenticated: true, isInitialized: true });
});

describe('PostVoteColumn – casting', () => {
  it('casts an up vote and puts the server score and vote into the cached feed', async () => {
    vi.mocked(voteService.cast).mockResolvedValue(vote(9, 'UP', 6));
    const { user, queryClient } = setup(5, null);

    await user.click(screen.getByRole('button', { name: 'Upvote' }));

    expect(voteService.cast).toHaveBeenCalledWith(
      { entityType: 'POST', entityId: 1, voteType: 'UP' },
      { skipErrorToast: true }
    );
    await waitFor(() =>
      expect(cached(queryClient)[0]).toMatchObject({
        voteScore: 6,
        myVote: { id: 9, voteType: 'UP' },
      })
    );
    expect(cached(queryClient)[1]).toMatchObject({ id: 2, voteScore: 50 });
  });

  it('switches direction with a cast, not a retract', async () => {
    vi.mocked(voteService.cast).mockResolvedValue(vote(9, 'DOWN', 3));
    const { user, queryClient } = setup(5, { id: 9, voteType: 'UP' });

    await user.click(screen.getByRole('button', { name: 'Downvote' }));

    expect(voteService.retract).not.toHaveBeenCalled();
    expect(voteService.cast).toHaveBeenCalledWith(
      { entityType: 'POST', entityId: 1, voteType: 'DOWN' },
      { skipErrorToast: true }
    );
    await waitFor(() => expect(cached(queryClient)[0]).toMatchObject({ voteScore: 3 }));
  });
});

describe('PostVoteColumn – retracting', () => {
  it('retracts with the id of the user’s vote when the same direction is clicked again', async () => {
    vi.mocked(voteService.retract).mockResolvedValue(undefined);
    const { user, queryClient } = setup(6, { id: 9, voteType: 'UP' });

    await user.click(screen.getByRole('button', { name: 'Upvote' }));

    expect(voteService.retract).toHaveBeenCalledWith(9, { skipErrorToast: true });
    expect(voteService.cast).not.toHaveBeenCalled();
    // 204 carries no score: the card takes the vote back itself.
    await waitFor(() =>
      expect(cached(queryClient)[0]).toMatchObject({ voteScore: 5, myVote: null })
    );
  });

  it('takes back a down vote by adding one', async () => {
    vi.mocked(voteService.retract).mockResolvedValue(undefined);
    const { user, queryClient } = setup(-2, { id: 4, voteType: 'DOWN' });

    await user.click(screen.getByRole('button', { name: 'Downvote' }));

    await waitFor(() => expect(cached(queryClient)[0]).toMatchObject({ voteScore: -1 }));
  });
});

describe('PostVoteColumn – while a request runs', () => {
  it('marks both buttons busy and sends only one request for repeated clicks', async () => {
    let finish: (value: unknown) => void = () => {};
    vi.mocked(voteService.cast).mockReturnValue(
      new Promise((resolve) => (finish = resolve)) as never
    );
    const { user } = setup(5, null);
    const up = screen.getByRole('button', { name: 'Upvote' });

    await user.click(up);
    await waitFor(() => expect(up).toHaveAttribute('aria-disabled', 'true'));
    expect(screen.getByRole('button', { name: 'Downvote' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    await user.click(up);
    await user.click(screen.getByRole('button', { name: 'Downvote' }));
    expect(voteService.cast).toHaveBeenCalledTimes(1);

    await act(async () => finish(vote(9, 'UP', 6)));
    await waitFor(() => expect(up).not.toHaveAttribute('aria-disabled'));
  });
});

describe('PostVoteColumn – failures', () => {
  it.each([
    [403, VOTE_LOCKED_MESSAGE, false],
    [404, VOTE_GONE_MESSAGE, true],
    [409, VOTE_CONFLICT_MESSAGE, true],
    [500, VOTE_ERROR_MESSAGE, false],
  ])(
    'on %i shows our message and refreshes the feed only when the state changed',
    async (status, message, refreshes) => {
      vi.mocked(voteService.cast).mockRejectedValue(httpError(status));
      const { user, queryClient, invalidate } = setup(5, null);

      await user.click(screen.getByRole('button', { name: 'Upvote' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
      // Nothing was saved, so the feed still shows what it showed.
      expect(cached(queryClient)[0]).toMatchObject({ voteScore: 5, myVote: null });
      expect(invalidate.mock.calls.length > 0).toBe(refreshes);
      expect(screen.getByRole('button', { name: 'Upvote' })).toBeEnabled();
    }
  );

  it('shows the generic message for a network error', async () => {
    vi.mocked(voteService.cast).mockRejectedValue(new Error('Network Error'));
    const { user } = setup(5, null);
    await user.click(screen.getByRole('button', { name: 'Upvote' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(VOTE_ERROR_MESSAGE));
  });
});

describe('PostVoteColumn – failures that depend on the action', () => {
  it('says the vote is gone, and refreshes the feed, when a retract is refused with 403', async () => {
    vi.mocked(voteService.retract).mockRejectedValue(httpError(403));
    const { user, invalidate } = setup(5, { id: 9, voteType: 'UP' });

    await user.click(screen.getByRole('button', { name: 'Upvote' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(VOTE_GONE_MESSAGE));
    expect(toast.error).not.toHaveBeenCalledWith(VOTE_LOCKED_MESSAGE);
    expect(invalidate).toHaveBeenCalled();
  });

  it('stays silent on a 401: the session ended and the user is being sent to sign in', async () => {
    vi.mocked(voteService.cast).mockRejectedValue(httpError(401));
    const { user } = setup(5, null);

    await user.click(screen.getByRole('button', { name: 'Upvote' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Upvote' })).toBeEnabled());
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe('PostVoteColumn – who may vote', () => {
  it('sends a guest to the login page and makes no request', async () => {
    useStore.setState({ user: null, isAuthenticated: false });
    const { user } = setup(5, null);

    await user.click(screen.getByRole('button', { name: 'Upvote' }));

    expect(push).toHaveBeenCalledWith('/login');
    expect(voteService.cast).not.toHaveBeenCalled();
  });

  it('waits for the session to be restored instead of treating a signed-in user as a guest', async () => {
    useStore.setState({ isInitialized: false });
    const { user } = setup(5, null);
    const up = screen.getByRole('button', { name: 'Upvote' });
    expect(up).toBeDisabled();
    await user.click(up);
    expect(push).not.toHaveBeenCalled();
  });

  it('highlights the direction of the user’s vote and shows the score', () => {
    setup(1500, { id: 9, voteType: 'UP' });
    expect(screen.getByRole('button', { name: 'Upvote' })).toHaveClass('text-blue-400');
    expect(screen.getByText('1.5k')).toBeInTheDocument();
  });

  it('shortens a large negative score like a positive one', () => {
    setup(-1500, null);
    expect(screen.getByText('-1.5k')).toBeInTheDocument();
  });
});
