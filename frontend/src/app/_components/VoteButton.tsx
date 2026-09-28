'use client';

import { cn } from '@/lib/cn';

export default function VoteButton({
  direction,
  active,
  onClick,
  children,
}: {
  direction: 'up' | 'down';
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeColor = direction === 'up' ? 'text-blue-400' : 'text-red-400';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 'up' ? 'Upvote' : 'Downvote'}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded hover:bg-slate-700 transition-colors',
        active ? activeColor : 'text-slate-400 hover:text-white'
      )}
    >
      {children}
    </button>
  );
}
