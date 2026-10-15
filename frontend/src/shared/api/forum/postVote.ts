import type { PagedResponse } from '@/shared/api/client/pagination.dto';
import type { PostSummary } from '@/shared/api/forum/post.dto';
import type { MyVote, VoteType } from '@/shared/api/forum/vote.dto';

/** How much one vote moves a score. */
export function voteValue(voteType: VoteType): 1 | -1 {
  return voteType === 'UP' ? 1 : -1;
}

/**
 * What a click on a vote button asks for. Clicking the direction already chosen takes the vote
 * back; anything else casts (a vote in the other direction switches the existing one).
 */
export type VoteAction = { kind: 'cast'; voteType: VoteType } | { kind: 'retract'; vote: MyVote };

export function voteActionFor(myVote: MyVote | null, clicked: VoteType): VoteAction {
  return myVote && myVote.voteType === clicked
    ? { kind: 'retract', vote: myVote }
    : { kind: 'cast', voteType: clicked };
}

/** The post as it should look after the server accepted a vote. */
export interface VoteOutcome {
  voteScore: number;
  myVote: MyVote | null;
}

/** The score after retracting `vote`: the server answers 204 without a score. */
export function scoreAfterRetract(score: number, vote: MyVote): number {
  return score - voteValue(vote.voteType);
}

/** Returns `page` with the outcome applied to the post `postId`; other posts are untouched. */
export function applyVoteOutcome(
  page: PagedResponse<PostSummary>,
  postId: number,
  outcome: VoteOutcome
): PagedResponse<PostSummary> {
  if (!page.content.some((post) => post.id === postId)) return page;
  return {
    ...page,
    content: page.content.map((post) => (post.id === postId ? { ...post, ...outcome } : post)),
  };
}
