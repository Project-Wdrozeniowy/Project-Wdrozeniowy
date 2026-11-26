import { useId, useState } from 'react';
import { ChartBarIcon } from '@/shared/ui/icons';

interface AnalyticsButtonProps {
  available: boolean;
  open: boolean;
  targetId: string;
  onToggle: () => void;
}

/** The explicitly approved addition to the post action row; no analytics prefetch. */
export default function AnalyticsButton({
  available,
  open,
  targetId,
  onToggle,
}: AnalyticsButtonProps) {
  const descriptionId = useId();
  const [explaining, setExplaining] = useState(false);
  return (
    <span className="relative ml-auto inline-flex" onMouseLeave={() => setExplaining(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={targetId}
        aria-disabled={!available || undefined}
        aria-describedby={!available ? descriptionId : undefined}
        className="flex items-center gap-2 min-h-11 rounded-lg px-3 text-sm font-semibold text-fg hover:bg-raised focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent aria-disabled:text-fg-subtle aria-disabled:cursor-not-allowed"
        onMouseEnter={() => setExplaining(true)}
        onFocus={() => setExplaining(true)}
        onBlur={() => setExplaining(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setExplaining(false);
        }}
        onClick={() => {
          if (available) onToggle();
          else setExplaining(true);
        }}
      >
        <ChartBarIcon />
        Analytics
      </button>
      {!available && (
        <span
          id={descriptionId}
          role="tooltip"
          className={
            explaining
              ? 'absolute right-0 top-full z-10 w-56 rounded-lg border border-line bg-surface p-3 text-xs text-fg shadow-lg'
              : 'sr-only'
          }
        >
          Analytics are unavailable for this post.
        </span>
      )}
    </span>
  );
}
