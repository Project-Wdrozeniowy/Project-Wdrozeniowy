import { useGetMyPostOpenings } from '@/shared/api/generated/orbita.api';
import type { AnalyticsPeriod } from '@/shared/api/analytics/analytics.const';
import { authorOpeningsKey } from './postOpenings';

/**
 * Openings per UTC day of the signed-in author's own post. Nothing is requested without an account
 * (the endpoint is owner-only), and a result is read again whenever it is mounted, never reused
 * across accounts. The caller mounts this under the current post/account key.
 */
export function usePostOpenings(
  postId: number,
  accountId: number | undefined,
  period: AnalyticsPeriod
) {
  return useGetMyPostOpenings(
    postId,
    { period },
    {
      query: {
        queryKey: authorOpeningsKey(postId, accountId, period),
        enabled: accountId !== undefined,
        staleTime: 0,
        retry: false,
      },
      request: { skipErrorToast: true },
    }
  );
}
