import { useGetPublicActivityComparison } from '@/shared/api/generated/orbita.api';
import {
  ANALYTICS_REQUEST,
  ANALYTICS_STALE_MS,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';

/** Posts and comments of the window against the window before it. Public: guests may read it. */
export function usePublicActivityComparison(period: AnalyticsPeriod) {
  return useGetPublicActivityComparison(
    { period },
    { query: { staleTime: ANALYTICS_STALE_MS, retry: false }, request: ANALYTICS_REQUEST }
  );
}
