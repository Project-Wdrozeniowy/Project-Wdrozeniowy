'use client';

import { useState } from 'react';
import { VoteColumn } from '@/features/post-interactions/VoteColumn';
import type { VoteType } from '@/shared/api/forum/vote.dto';

interface LocalVoteColumnProps {
  score: number;
}

/** Votes on the home page's fixtures: kept on the card only, and gone on reload (PWDRZ-111). */
export function LocalVoteColumn({ score }: LocalVoteColumnProps) {
  const [voted, setVoted] = useState<VoteType | null>(null);
  // Derived, so a refetched vote count is never hidden behind a stale copy in state.
  const shown = score + (voted === 'UP' ? 1 : voted === 'DOWN' ? -1 : 0);

  return (
    <VoteColumn
      score={shown}
      chosen={voted}
      onVote={(direction) => setVoted((current) => (current === direction ? null : direction))}
    />
  );
}
