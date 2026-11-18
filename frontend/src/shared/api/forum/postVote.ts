import type { InfiniteData } from '@tanstack/react-query';
import type { PagedResponse } from '@/shared/api/client/pagination.dto';
import type { PostDto as Post } from '@/shared/api/generated/models/postDto.dto';
import type { PostSummaryDto as PostSummary } from '@/shared/api/generated/models/postSummaryDto.dto';
import type { MyVoteDto as MyVote } from '@/shared/api/generated/models/myVoteDto.dto';
import type { VoteRequestVoteType as VoteType } from '@/shared/api/generated/models/voteRequestVoteType.dto';

/**
 * True for the cached post of the post page (`/forum/posts/{slug}`) with this id: a query whose
 * data is a whole post. The feed, the comments and other lists never match.
 */
export function isPostDetailQuery(
  query: { queryKey: readonly unknown[]; state: { data: unknown } },
  postId: number
): boolean {
  const [path] = query.queryKey;
  if (typeof path !== 'string' || !path.startsWith('/forum/posts/') || path.endsWith('/comments')) {
    return false;
  }
  const data = query.state.data as Partial<Post> | undefined;
  return data?.id === postId && typeof data.slug === 'string' && 'voteScore' in data;
}

/** `applyVoteOutcome` for a list loaded page by page (the profile's posts of one author). */
export function applyVoteOutcomeToPages(
  data: InfiniteData<PagedResponse<PostSummary>>,
  postId: number,
  outcome: VoteOutcome
): InfiniteData<PagedResponse<PostSummary>> {
  return { ...data, pages: data.pages.map((page) => applyVoteOutcome(page, postId, outcome)) };
}

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
