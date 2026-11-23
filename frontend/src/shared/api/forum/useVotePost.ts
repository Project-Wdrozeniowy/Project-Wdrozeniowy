import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { apiErrorStatus } from '@/shared/api/client/apiError';
import type { PagedResponse } from '@/shared/api/client/pagination.dto';
import { AUTHOR_POSTS_QUERY_KEY } from '@/shared/api/forum/authorPosts.const';
import { FEED_QUERY_KEY } from '@/shared/api/forum/feedQuery.const';
import { castVote, retractVote } from '@/shared/api/generated/orbita.api';
import type { PostDto as Post } from '@/shared/api/generated/models/postDto.dto';
import type { PostSummaryDto as PostSummary } from '@/shared/api/generated/models/postSummaryDto.dto';
import {
  applyVoteOutcome,
  applyVoteOutcomeToPages,
  isPostDetailQuery,
  scoreAfterRetract,
  voteActionFor,
} from '@/shared/api/forum/postVote';
import type { VoteOutcome } from '@/shared/api/forum/postVote';
import {
  VOTE_CONFLICT_MESSAGE,
  VOTE_ERROR_MESSAGE,
  VOTE_GONE_MESSAGE,
  VOTE_LOCKED_MESSAGE,
} from '@/shared/api/forum/vote.const';
import type { MyVoteDto as MyVote } from '@/shared/api/generated/models/myVoteDto.dto';
import type { VoteRequestVoteType as VoteType } from '@/shared/api/generated/models/voteRequestVoteType.dto';
import { toast } from '@/shared/lib/toast';
import { invalidatePostEngagement } from '@/shared/api/analytics/postEngagement';

/** Identifies the votes on one post, whichever screen started them. */
export const votePostMutationKey = (postId: number) => ['vote-post', postId] as const;

/** What the user is looking at when they click: needed to choose between cast and retract. */
export interface VoteClick {
  clicked: VoteType;
  /** The post as shown now: its score and the user's current vote. */
  voteScore: number;
  myVote: MyVote | null;
}

/**
 * What to tell the user, or `null` to say nothing. A 401 is not a vote problem: the API client
 * has already ended the session and is sending the user to sign in.
 */
function failureMessage(status: number | undefined, retracting: boolean): string | null {
  if (status === 401) return null;
  // 403 on a retract means the vote is not the user's (a stale id); on a cast it means a locked post.
  if (status === 403) return retracting ? VOTE_GONE_MESSAGE : VOTE_LOCKED_MESSAGE;
  if (status === 404) return VOTE_GONE_MESSAGE;
  if (status === 409) return VOTE_CONFLICT_MESSAGE;
  return VOTE_ERROR_MESSAGE;
}

/**
 * Votes on one post. Clicking the direction already chosen retracts the vote, anything else
 * casts one (the server switches an existing vote). The feed cache gets the server's answer, so
 * the screen never shows a vote the server did not accept (a retract's score is the one exception:
 * the server sends none, so it is computed and then confirmed by a reload). While a request runs
 * the post has a pending vote (`useIsMutating` with `votePostMutationKey`) and the buttons should
 * not react, so two requests never race each other, even from two screens.
 */
export function useVotePost(postId: number) {
  const queryClient = useQueryClient();
  // The post page keeps the post under its own key, whatever page the vote is made on: every
  // cached copy of this post gets the same answer.
  const isDetail = (query: Parameters<typeof isPostDetailQuery>[0]) =>
    isPostDetailQuery(query, postId);

  return useMutation({
    mutationKey: votePostMutationKey(postId),
    // Offline, the request still goes out and fails, so the user gets the message. Paused until the
    // network came back, the vote would be sent later with no sign of it, and the post would stay
    // busy on every screen meanwhile.
    networkMode: 'always',
    mutationFn: async ({ clicked, voteScore, myVote }: VoteClick): Promise<VoteOutcome> => {
      const action = voteActionFor(myVote, clicked);
      // The page shows its own message on failure; the global toast would print server text.
      const config = { skipErrorToast: true };
      if (action.kind === 'retract') {
        await retractVote(action.vote.id, config);
        return { voteScore: scoreAfterRetract(voteScore, action.vote), myVote: null };
      }
      const vote = await castVote(
        { entityType: 'POST', entityId: postId, voteType: action.voteType },
        config
      );
      return { voteScore: vote.newScore, myVote: { id: vote.id, voteType: vote.voteType } };
    },
    onSuccess: (outcome, { myVote, clicked }) => {
      void invalidatePostEngagement(queryClient, postId);
      queryClient.setQueriesData<PagedResponse<PostSummary>>(
        { queryKey: FEED_QUERY_KEY },
        (page) => (page ? applyVoteOutcome(page, postId, outcome) : page)
      );
      // The profile's list of one author's posts is loaded page by page and has its own key.
      queryClient.setQueriesData<InfiniteData<PagedResponse<PostSummary>>>(
        { queryKey: AUTHOR_POSTS_QUERY_KEY },
        (data) => (data ? applyVoteOutcomeToPages(data, postId, outcome) : data)
      );
      queryClient.setQueriesData<Post>({ predicate: isDetail }, (post) =>
        post ? { ...post, ...outcome } : post
      );
      // A cast answers with the new score. A retract answers with nothing (204), so the score
      // written above is computed here and the feed is reloaded to confirm it.
      if (voteActionFor(myVote, clicked).kind === 'retract') {
        void queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
        // Only the list on screen is reloaded now; others are marked old and reload when opened.
        void queryClient.invalidateQueries({
          queryKey: AUTHOR_POSTS_QUERY_KEY,
          refetchType: 'active',
        });
        void queryClient.invalidateQueries({ predicate: isDetail });
      }
    },
    onError: (error, { clicked, myVote }) => {
      const status = apiErrorStatus(error);
      const retracting = voteActionFor(myVote, clicked).kind === 'retract';
      const message = failureMessage(status, retracting);
      if (message) toast.error(message);
      // The post or the vote changed under us: show the real state.
      if (status === 404 || status === 409 || (retracting && status === 403)) {
        void queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
        // Only the list on screen is reloaded now; others are marked old and reload when opened.
        void queryClient.invalidateQueries({
          queryKey: AUTHOR_POSTS_QUERY_KEY,
          refetchType: 'active',
        });
        void queryClient.invalidateQueries({ predicate: isDetail });
      }
    },
  });
}
