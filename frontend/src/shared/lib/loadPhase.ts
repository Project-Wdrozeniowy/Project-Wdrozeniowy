/**
 * The phase of a query that has to load once before anything can be shown. It gives every screen
 * the same meaning for "loading", "failed" and "retrying"; what to fetch, how long to cache it and
 * which words to show stay with the screen that owns the query.
 *
 * States that look alike but are not mapped here, because they keep data on screen and need no
 * full-panel feedback:
 * - background refresh with data on screen: keep the data (`isFetching` is enough to show a quiet
 *   indicator);
 * - failed refresh with data on screen (`isRefetchError`): keep the data and add a recoverable
 *   notice beside it, never a full-panel error;
 * - another page loading while the previous one is kept as placeholder (`isPlaceholderData`): a
 *   feature decision, because only the feature knows whether the old page would look like the new.
 *   The one exception is a page that failed before and is retried: that is `retrying` (pass
 *   `isPlaceholderData`), so the error stays on screen instead of the old page coming back.
 * Empty data is a loaded state (`loaded`) the feature words itself; it is not a failure.
 */
export type LoadPhase = 'loading' | 'failed' | 'retrying' | 'loaded';

interface LoadQueryState {
  isPending: boolean;
  /** Failed before there was any data. */
  isLoadingError: boolean;
  isFetching: boolean;
  /**
   * How many times the query has failed. While a retry runs the query is `pending` again, so this
   * is what tells a retry from a first load. Required: leaving it out would make every retry look
   * like a first load and bring the skeleton back in place of the error.
   */
  errorUpdateCount: number;
  /** Pass it for a query with `placeholderData`: a retry of a failed page then keeps the error. */
  isPlaceholderData?: boolean;
}

export function getLoadPhase(query: LoadQueryState): LoadPhase {
  if (query.isLoadingError) return query.isFetching ? 'retrying' : 'failed';
  if (query.isPending) {
    return query.isFetching && query.errorUpdateCount > 0 ? 'retrying' : 'loading';
  }
  if (query.isPlaceholderData && query.isFetching && query.errorUpdateCount > 0) return 'retrying';
  return 'loaded';
}
