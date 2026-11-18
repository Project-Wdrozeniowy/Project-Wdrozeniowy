import {
  applyVoteOutcome,
  applyVoteOutcomeToPages,
  isPostDetailQuery,
  scoreAfterRetract,
  voteActionFor,
  voteValue,
} from '../postVote';
import type { PostSummaryDto as PostSummary } from '@/shared/api/generated/models/postSummaryDto.dto';
import type { PagedResponse } from '@/shared/api/client/pagination.dto';

function post(id: number, voteScore = 0): PostSummary {
  return { id, voteScore, myVote: null } as PostSummary;
}

function page(...posts: PostSummary[]): PagedResponse<PostSummary> {
  return {
    content: posts,
    page: 0,
    size: 10,
    totalElements: posts.length,
    totalPages: 1,
    first: true,
    last: true,
  };
}

describe('voteValue', () => {
  it('is +1 for UP and -1 for DOWN', () => {
    expect(voteValue('UP')).toBe(1);
    expect(voteValue('DOWN')).toBe(-1);
  });
});

describe('voteActionFor', () => {
  it('casts when there is no vote yet', () => {
    expect(voteActionFor(null, 'UP')).toEqual({ kind: 'cast', voteType: 'UP' });
  });

  it('retracts when the clicked direction is the current vote', () => {
    const vote = { id: 9, voteType: 'UP' as const };
    expect(voteActionFor(vote, 'UP')).toEqual({ kind: 'retract', vote });
  });

  it('casts (switches) when the other direction is clicked', () => {
    expect(voteActionFor({ id: 9, voteType: 'UP' }, 'DOWN')).toEqual({
      kind: 'cast',
      voteType: 'DOWN',
    });
  });
});

describe('scoreAfterRetract', () => {
  it('takes an up vote back', () => {
    expect(scoreAfterRetract(5, { id: 1, voteType: 'UP' })).toBe(4);
  });

  it('takes a down vote back', () => {
    expect(scoreAfterRetract(-3, { id: 1, voteType: 'DOWN' })).toBe(-2);
  });
});

describe('applyVoteOutcome', () => {
  it('changes only the voted post', () => {
    const before = page(post(1, 5), post(2, 7));
    const after = applyVoteOutcome(before, 2, { voteScore: 8, myVote: { id: 3, voteType: 'UP' } });
    expect(after.content[0]).toBe(before.content[0]);
    expect(after.content[1]).toMatchObject({ id: 2, voteScore: 8, myVote: { id: 3 } });
  });

  it('returns the same page when the post is not on it', () => {
    const before = page(post(1));
    expect(applyVoteOutcome(before, 99, { voteScore: 1, myVote: null })).toBe(before);
  });

  it('does not mutate its input', () => {
    const before = page(post(1, 5));
    applyVoteOutcome(before, 1, { voteScore: 6, myVote: null });
    expect(before.content[0].voteScore).toBe(5);
  });
});

describe('isPostDetailQuery', () => {
  const detail = { id: 5, slug: 'hello', voteScore: 3, content: 'text' };
  const query = (queryKey: unknown[], data: unknown) => ({ queryKey, state: { data } });

  it('matches the cached post of the post page with this id', () => {
    expect(isPostDetailQuery(query(['/forum/posts/hello'], detail), 5)).toBe(true);
  });

  it('does not match another post, or no data yet', () => {
    expect(isPostDetailQuery(query(['/forum/posts/hello'], detail), 6)).toBe(false);
    expect(isPostDetailQuery(query(['/forum/posts/hello'], undefined), 5)).toBe(false);
  });

  it('does not match the feed, the comments or a query of something else', () => {
    expect(isPostDetailQuery(query(['/forum/posts', { page: 0 }], detail), 5)).toBe(false);
    expect(isPostDetailQuery(query(['/forum/posts/hello/comments'], detail), 5)).toBe(false);
    expect(isPostDetailQuery(query(['/notifications'], detail), 5)).toBe(false);
    expect(isPostDetailQuery(query([{ not: 'a path' }], detail), 5)).toBe(false);
  });

  it('does not match data that is not a whole post', () => {
    expect(isPostDetailQuery(query(['/forum/posts/hello'], { id: 5 }), 5)).toBe(false);
  });
});

describe('applyVoteOutcomeToPages', () => {
  it('applies the outcome to the post on whichever loaded page holds it', () => {
    const data = {
      pages: [page(post(1, 5), post(2, 1)), page(post(3, 8))],
      pageParams: [0, 1],
    };

    const next = applyVoteOutcomeToPages(data, 3, {
      voteScore: 9,
      myVote: { id: 4, voteType: 'UP' },
    });

    expect(next.pages[1].content[0]).toMatchObject({ id: 3, voteScore: 9, myVote: { id: 4 } });
    expect(next.pages[0].content.map((p) => p.voteScore)).toEqual([5, 1]);
    expect(next.pageParams).toEqual([0, 1]);
  });
});
