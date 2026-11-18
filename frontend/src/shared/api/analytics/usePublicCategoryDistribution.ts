import { useGetPublicCategoryDistribution } from '@/shared/api/generated/orbita.api';
import {
  ANALYTICS_REQUEST,
  ANALYTICS_STALE_MS,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';

/** Public posts of the window by category. */
export function usePublicCategoryDistribution(period: AnalyticsPeriod) {
  return useGetPublicCategoryDistribution(
    { period },
    { query: { staleTime: ANALYTICS_STALE_MS, retry: false }, request: ANALYTICS_REQUEST }
  );
}
