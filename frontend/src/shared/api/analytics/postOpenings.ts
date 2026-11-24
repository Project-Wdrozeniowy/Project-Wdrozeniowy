import { getGetMyPostOpeningsQueryKey } from '@/shared/api/generated/orbita.api';
import type { AnalyticsPeriod } from '@/shared/api/analytics/analytics.const';

/**
 * The author's daily openings are owner-only, so the account is part of the key: another account
 * never reads this one's copy, and the generated prefix stays so invalidation reaches every copy.
 */
export const authorOpeningsKey = (
  postId: number,
  accountId: number | undefined,
  period: AnalyticsPeriod
) => [...getGetMyPostOpeningsQueryKey(postId, { period }), { accountId }] as const;
