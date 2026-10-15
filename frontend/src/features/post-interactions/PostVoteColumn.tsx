'use client';

import { useRouter } from 'next/navigation';
import { VoteColumn } from '@/features/post-interactions/VoteColumn';
import type { MyVote, VoteType } from '@/shared/api/forum/vote.dto';
import { useVotePost } from '@/shared/api/forum/useVotePost';
import { useStore } from '@/store';

interface PostVoteColumnProps {
  postId: number;
  score: number;
  myVote: MyVote | null;
}

/** The vote buttons of a post from the API. A guest is sent to sign in instead of voting. */
export function PostVoteColumn({ postId, score, myVote }: PostVoteColumnProps) {
  const router = useRouter();
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isInitialized = useStore((state) => state.isInitialized);
  const { mutate, isPending } = useVotePost(postId);

  function handleVote(direction: VoteType) {
    if (isPending) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
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
