import { useId } from 'react';
import type { ReactNode } from 'react';

interface SkeletonStatusProps {
  /** What is happening, in the screen's own words. It names the region for assistive technology. */
  label: string;
  /** Shows the label to everyone. By default only assistive technology reads it. */
  showLabel?: boolean;
  /**
   * Loading is in progress (`aria-busy`). Pass `false` for a placeholder that is not loading
   * anything, with a label that says so, so it does not claim to be loading forever.
   */
  busy?: boolean;
  /** Layout of the whole region. */
  className?: string;
  /** The placeholder blocks. They are decoration and hidden from assistive technology. */
  children: ReactNode;
}

/** The meaning of a placeholder: a status region with a name. The layout stays the screen's own. */
export default function SkeletonStatus({
  label,
  showLabel = false,
  busy = true,
  className,
  children,
}: SkeletonStatusProps) {
  const labelId = useId();

  return (
    <div role="status" aria-labelledby={labelId} aria-busy={busy} className={className}>
      {/* One source for the name: this text, so it is read once. */}
      <p id={labelId} className={showLabel ? 'text-fg-subtle text-sm' : 'sr-only'}>
        {label}
      </p>
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </div>
  );
}
