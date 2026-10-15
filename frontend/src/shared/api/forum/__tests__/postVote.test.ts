import { applyVoteOutcome, scoreAfterRetract, voteActionFor, voteValue } from '../postVote';
import type { PostSummary } from '../post.dto';
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
