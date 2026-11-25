import { REFRESH_FAILED_SUFFIX } from '@/pages/dashboard/config/dashboard.const';
import PanelError from '@/shared/ui/PanelError';

interface RefreshFailedNoticeProps {
  /** What could not be updated, in lower case: "categories", "the activity chart". */
  what: string;
  /** A retry is running. */
  retrying: boolean;
  onRetry: () => unknown;
}

/**
 * A background refresh failed while figures are on screen: they stay, with a fixed message and a
 * retry, instead of a silent stale number or a full-panel error. Never the server's text.
 */
export default function RefreshFailedNotice({ what, retrying, onRetry }: RefreshFailedNoticeProps) {
  return (
    <PanelError
      message={`Could not update ${what}. ${REFRESH_FAILED_SUFFIX}`}
      retrying={retrying}
      onRetry={onRetry}
    />
  );
}
