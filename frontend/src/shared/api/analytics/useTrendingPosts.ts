import { useGetTrendingPosts } from '@/shared/api/generated/orbita.api';
import {
  ANALYTICS_REQUEST,
  ANALYTICS_STALE_MS,
  TOP_POSTS_LIMIT,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';

/** The most active posts of the window, as the server ranks them. Public. */
export function useTrendingPosts(period: AnalyticsPeriod) {
  return useGetTrendingPosts(
    { period, limit: TOP_POSTS_LIMIT },
    { query: { staleTime: ANALYTICS_STALE_MS, retry: false }, request: ANALYTICS_REQUEST }
  );
}
