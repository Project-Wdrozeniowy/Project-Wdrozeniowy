import type { ReactNode } from 'react';
import { getLoadPhase } from '@/shared/lib/loadPhase';
import PanelError from '@/shared/ui/PanelError';
import { PANEL_ERROR_TEXT } from '@/shared/ui/panelError.const';

interface QueryStateProps {
  query: {
    isPending: boolean;
    /** Failed before there was any data: a failed refresh keeps showing the old data. */
    isLoadingError: boolean;
    isFetching: boolean;
    /** Lets a retry be told from a first load; see `getLoadPhase`. */
    errorUpdateCount: number;
    refetch: () => unknown;
  };
  /** Defaults to the shared fixed message. */
  errorText?: string;
  skeleton: ReactNode;
  /** The data is there but there is nothing to show. */
  empty?: boolean;
  emptyText?: string;
  children: ReactNode;
}

/** Loading, failed, empty or the data: the four states of a card that reads one query. */
export default function QueryState({
  query,
  errorText = PANEL_ERROR_TEXT,
  skeleton,
  empty = false,
  emptyText = '',
  children,
}: QueryStateProps) {
  const phase = getLoadPhase(query);
  if (phase === 'failed' || phase === 'retrying') {
    // Kept on screen while the retry runs, so the keyboard user keeps their place.
    return (
      <PanelError
        message={errorText}
        onRetry={() => query.refetch()}
        retrying={phase === 'retrying'}
      />
    );
  }
  if (phase === 'loading') return <>{skeleton}</>;
  if (empty) return <p className="text-sm text-fg-subtle">{emptyText}</p>;
  return <>{children}</>;
}
