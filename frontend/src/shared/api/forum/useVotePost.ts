import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorStatus } from '@/shared/api/client/apiError';
import type { PagedResponse } from '@/shared/api/client/pagination.dto';
import { FEED_QUERY_KEY } from '@/shared/api/forum/feedQuery.const';
import { voteService } from '@/shared/api/forum/forumClient';
import type { PostSummary } from '@/shared/api/forum/post.dto';
import { applyVoteOutcome, scoreAfterRetract, voteActionFor } from '@/shared/api/forum/postVote';
import type { VoteOutcome } from '@/shared/api/forum/postVote';
import {
  VOTE_CONFLICT_MESSAGE,
  VOTE_ERROR_MESSAGE,
  VOTE_GONE_MESSAGE,
  VOTE_LOCKED_MESSAGE,
} from '@/shared/api/forum/vote.const';
import type { MyVote, VoteType } from '@/shared/api/forum/vote.dto';
import { toast } from '@/shared/lib/toast';

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
 * `isPending` is true and the buttons should not react, so two requests never race each other.
 */
export function useVotePost(postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['vote-post', postId],
    mutationFn: async ({ clicked, voteScore, myVote }: VoteClick): Promise<VoteOutcome> => {
      const action = voteActionFor(myVote, clicked);
      // The page shows its own message on failure; the global toast would print server text.
      const config = { skipErrorToast: true };
      if (action.kind === 'retract') {
        await voteService.retract(action.vote.id, config);
        return { voteScore: scoreAfterRetract(voteScore, action.vote), myVote: null };
      }
      const vote = await voteService.cast(
        { entityType: 'POST', entityId: postId, voteType: action.voteType },
        config
      );
      return { voteScore: vote.newScore, myVote: { id: vote.id, voteType: vote.voteType } };
    },
    onSuccess: (outcome, { myVote, clicked }) => {
      queryClient.setQueriesData<PagedResponse<PostSummary>>(
        { queryKey: FEED_QUERY_KEY },
        (page) => (page ? applyVoteOutcome(page, postId, outcome) : page)
      );
      // A cast answers with the new score. A retract answers with nothing (204), so the score
      // written above is computed here and the feed is reloaded to confirm it.
      if (voteActionFor(myVote, clicked).kind === 'retract') {
        void queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
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
      }
    },
  });
}
