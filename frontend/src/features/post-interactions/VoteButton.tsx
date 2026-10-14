'use client';

import { cn } from '@/shared/lib/cn';

interface VoteButtonProps {
  direction: 'up' | 'down';
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** Tooltip, used to explain why the button is disabled. */
  title?: string;
  children: React.ReactNode;
}

export default function VoteButton({
  direction,
  active,
  onClick,
  disabled = false,
  title,
  children,
}: VoteButtonProps) {
  const activeColor = direction === 'up' ? 'text-blue-400' : 'text-red-400';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={direction === 'up' ? 'Upvote' : 'Downvote'}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded transition-colors',
        'hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        active ? activeColor : 'text-slate-400 hover:text-white disabled:hover:text-slate-400'
      )}
    >
      {children}
    </button>
  );
}
