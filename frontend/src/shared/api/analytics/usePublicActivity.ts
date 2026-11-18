import { useGetPublicActivity } from '@/shared/api/generated/orbita.api';
import {
  ANALYTICS_REQUEST,
  ANALYTICS_STALE_MS,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';

/** Public posts and comments per UTC day. */
export function usePublicActivity(period: AnalyticsPeriod) {
  return useGetPublicActivity(
    { period },
    { query: { staleTime: ANALYTICS_STALE_MS, retry: false }, request: ANALYTICS_REQUEST }
  );
}
