import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { VoteColumn } from '@/features/post-interactions/VoteColumn';
import type { MyVoteDto as MyVote } from '@/shared/api/generated/models/myVoteDto.dto';
import type { VoteRequestVoteType as VoteType } from '@/shared/api/generated/models/voteRequestVoteType.dto';
import { useVotePost, votePostMutationKey } from '@/shared/api/forum/useVotePost';
import { useStore } from '@/store';

interface PostVoteColumnProps {
  postId: number;
  score: number;
  myVote: MyVote | null;
}

/** The vote buttons of a post from the API. A guest is sent to sign in instead of voting. */
export function PostVoteColumn({ postId, score, myVote }: PostVoteColumnProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isInitialized = useStore((state) => state.isInitialized);
  const { mutate } = useVotePost(postId);
  // Any pending vote on this post, also one started on another screen a moment ago: a second one
  // would race it with the vote this column still shows. This is what the buttons look like.
  const isPending = useIsMutating({ mutationKey: votePostMutationKey(postId) }) > 0;

  function handleVote(direction: VoteType) {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    // Asked of the cache at the click, not of the last render: a double click delivers its second
    // click before the screen has caught up with the first one.
    if (queryClient.isMutating({ mutationKey: votePostMutationKey(postId) }) > 0) return;
    mutate({ clicked: direction, voteScore: score, myVote });
  }

  return (
    <VoteColumn
      score={score}
      chosen={myVote?.voteType ?? null}
      onVote={handleVote}
      // Until the session is restored a signed-in user would look like a guest.
      disabled={!isInitialized}
      busy={isPending}
    />
  );
}
