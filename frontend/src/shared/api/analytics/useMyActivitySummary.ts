import { useGetMyActivitySummary } from '@/shared/api/generated/orbita.api';
import { ANALYTICS_REQUEST, ANALYTICS_STALE_MS } from '@/shared/api/analytics/analytics.const';
import { useStore } from '@/store';

/** The signed-in user's own totals. Nothing is requested for a guest. */
export function useMyActivitySummary() {
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  return useGetMyActivitySummary({
    query: { enabled: isAuthenticated, staleTime: ANALYTICS_STALE_MS, retry: false },
    request: ANALYTICS_REQUEST,
  });
}
