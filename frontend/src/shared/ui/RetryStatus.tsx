import { useState } from 'react';
import { RETRY_FAILED_MESSAGE, RETRYING_LABEL } from '@/shared/ui/retryButton.const';

interface RetryStatusProps {
  /** The owner's retry is running. */
  retrying: boolean;
  retryingLabel?: string;
}

/**
 * The polite announcement of a retry, for a `RetryButton` rendered with `status={false}`: place it
 * outside any node that a control references with `aria-describedby`, so the message is not read
 * as part of that description. It must be mounted before the retry starts (a live region only
 * reads changes) and unmounted when the failure goes away: a retry that ends while it is still
 * mounted is announced as failed.
 */
export default function RetryStatus({
  retrying,
  retryingLabel = RETRYING_LABEL,
}: RetryStatusProps) {
  const [wasRetrying, setWasRetrying] = useState(retrying);
  const [failedAgain, setFailedAgain] = useState(false);
  if (retrying !== wasRetrying) {
    setWasRetrying(retrying);
    setFailedAgain(!retrying);
  }

  return (
    <span role="status" className="sr-only">
      {retrying ? retryingLabel : failedAgain ? RETRY_FAILED_MESSAGE : ''}
    </span>
  );
}
