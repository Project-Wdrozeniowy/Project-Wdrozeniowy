import VoteButton from '@/features/post-interactions/VoteButton';
import type { VoteType } from '@/shared/api/forum/vote.dto';
import { cn } from '@/shared/lib/cn';
import { ChevronDownVoteIcon, ChevronUpVoteIcon } from '@/shared/ui/icons';

interface VoteColumnProps {
  score: number;
  /** The direction the user has chosen, if any. */
  chosen: VoteType | null;
  onVote: (direction: VoteType) => void;
  disabled?: boolean;
  /** A request is running: the buttons look disabled but keep the keyboard focus. */
  busy?: boolean;
}

function formatScore(score: number): string {
  const size = Math.abs(score);
  if (size < 1000) return String(score);
  // Negative scores are shortened like positive ones: -1500 reads "-1.5k".
  const thousands = Math.round(size / 100) / 10;
  const text = thousands >= 1000 ? `${(size / 1_000_000).toFixed(1)}M` : `${thousands.toFixed(1)}k`;
  return score < 0 ? `-${text}` : text;
}

/** The up button, the score and the down button of a post. Shows state, owns none. */
export function VoteColumn({ score, chosen, onVote, disabled, busy }: VoteColumnProps) {
  return (
    <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
      <VoteButton
        direction="up"
        active={chosen === 'UP'}
        onClick={() => onVote('UP')}
        disabled={disabled}
        busy={busy}
      >
        <ChevronUpVoteIcon />
      </VoteButton>
      <span
        className={cn(
          'font-semibold text-sm',
          chosen === 'UP' && 'text-blue-400',
          chosen === 'DOWN' && 'text-red-400',
          chosen === null && 'text-white'
        )}
      >
        {formatScore(score)}
      </span>
      <VoteButton
        direction="down"
        active={chosen === 'DOWN'}
        onClick={() => onVote('DOWN')}
        disabled={disabled}
        busy={busy}
      >
        <ChevronDownVoteIcon />
      </VoteButton>
    </div>
  );
}
