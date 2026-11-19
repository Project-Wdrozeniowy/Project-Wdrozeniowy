import RetryButton from '@/shared/ui/RetryButton';
import { cn } from '@/shared/lib/cn';

interface ErrorCardProps {
  /** The screen's own fixed words; never the server's text. */
  message: string;
  onRetry: () => unknown;
  retrying: boolean;
  /** Padding and spacing in the screen's layout; the card sets none of its own. */
  className?: string;
}

/**
 * A recoverable failure in a card of its own: a feed, a profile, a list. The screen decides the
 * words and when to show it (see `getLoadPhase`) and keeps it mounted while `retrying`.
 */
export default function ErrorCard({ message, onRetry, retrying, className }: ErrorCardProps) {
  return (
    <div
      role="alert"
      className={cn(
        'bg-surface rounded-xl flex flex-col items-start gap-3 border border-line',
        className
      )}
    >
      <p className="text-fg text-sm">{message}</p>
      <RetryButton onRetry={onRetry} retrying={retrying} />
    </div>
  );
}
