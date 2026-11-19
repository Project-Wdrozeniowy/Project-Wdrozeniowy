import { useRef } from 'react';
import { RETRY_BUTTON_VARIANTS, RETRY_LABEL, RETRYING_LABEL } from '@/shared/ui/retryButton.const';
import type { RetryButtonVariant } from '@/shared/ui/retryButton.const';
import RetryStatus from '@/shared/ui/RetryStatus';

interface RetryButtonProps {
  /** Starts the retry. A returned promise keeps further activations out until it settles. */
  onRetry: () => unknown;
  /** The owner's retry is running. */
  retrying: boolean;
  variant?: RetryButtonVariant;
  /** Defaults to the shared wording; a screen may name what it retries. */
  label?: string;
  retryingLabel?: string;
  /**
   * Renders the announcement next to the button (default). Pass `false` when the button sits inside
   * a node that a control references with `aria-describedby`, and render `RetryStatus` outside it.
   */
  status?: boolean;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | undefined)?.then === 'function';
}

/**
 * The retry action every failed load shares, wherever it sits (a page panel, a card, a field).
 *
 * - One activation starts one retry: while `retrying` is set, and while a promise returned by
 *   `onRetry` is pending, further activations do nothing.
 * - While retrying it stays in the page and in the tab order (`aria-disabled`, not `disabled`), so
 *   the keyboard user keeps their place. The owner must keep it mounted while `retrying`.
 * - The start of a retry is announced politely through a status region that exists from the first
 *   render, so the change is read. If the retry ends and the button is still on screen, the retry
 *   failed, and that is announced too (a success removes the failure, and the button with it).
 *
 * It does not choose a layout, a message or what is fetched; that stays with the owner.
 */
export default function RetryButton({
  onRetry,
  retrying,
  variant = 'solid',
  label = RETRY_LABEL,
  retryingLabel = RETRYING_LABEL,
  status = true,
}: RetryButtonProps) {
  const inFlight = useRef(false);

  function activate() {
    if (retrying || inFlight.current) return;
    const result = onRetry();
    if (isThenable(result)) {
      inFlight.current = true;
      const release = () => {
        inFlight.current = false;
      };
      result.then(release, release);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={activate}
        aria-disabled={retrying || undefined}
        className={RETRY_BUTTON_VARIANTS[variant]}
      >
        {retrying ? retryingLabel : label}
      </button>
      {status && <RetryStatus retrying={retrying} retryingLabel={retryingLabel} />}
    </>
  );
}
