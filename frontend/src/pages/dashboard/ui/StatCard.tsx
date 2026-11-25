import { NO_EARLIER_DATA_TEXT, UNAVAILABLE_TEXT } from '@/pages/dashboard/config/dashboard.const';
import { formatChange } from '@/shared/lib/formatChange';
import { cn } from '@/shared/lib/cn';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  /** The picture of what the card counts; decorative, the label names the card. */
  icon: ReactNode;
  /** What the number counts, e.g. "Last 7 days". */
  caption: string;
  value: number | undefined;
  /** The change against the window before, in percent; `undefined` for a number with no window. */
  change?: number | null;
  isPending: boolean;
  isError: boolean;
}

const TONE_CLASS = {
  up: 'text-success',
  down: 'text-danger',
  flat: 'text-fg-subtle',
  none: 'text-fg-subtle',
} as const;

export default function StatCard({
  label,
  icon,
  caption,
  value,
  change,
  isPending,
  isError,
}: StatCardProps) {
  const shown = change === undefined ? null : formatChange(change);

  return (
    <div className="bg-surface rounded-xl p-5 flex items-start justify-between gap-3 border border-line">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-fg-subtle text-sm">{label}</span>
        {isPending ? (
          <span
            role="status"
            aria-label={`Loading ${label}`}
            className="h-9 w-20 bg-raised rounded animate-pulse"
          />
        ) : isError || value === undefined ? (
          <span className="text-fg-subtle text-base py-1.5">{UNAVAILABLE_TEXT}</span>
        ) : (
          <span className="text-fg font-bold text-3xl">{value.toLocaleString('en-US')}</span>
        )}
        <span className="text-xs text-fg-subtle">{caption}</span>
        {shown && !isPending && !isError && (
          <span className={cn('text-sm', TONE_CLASS[shown.tone])}>
            {shown.tone === 'none' ? NO_EARLIER_DATA_TEXT : `${shown.text} vs the window before`}
          </span>
        )}
      </div>
      <div
        aria-hidden="true"
        className="w-12 h-12 rounded-xl bg-blue-500/15 text-accent flex items-center justify-center shrink-0"
      >
        {icon}
      </div>
    </div>
  );
}
