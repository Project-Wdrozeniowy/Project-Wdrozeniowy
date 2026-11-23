import type { QueryClient, QueryFilters } from '@tanstack/react-query';
import {
  getAuthorSummaryQueryKey,
  getPublicSummaryQueryKey,
} from '@/shared/api/generated/orbita.api';

/** Keep the generated prefix so invalidation reaches every account-scoped copy. */
export const authorEngagementKey = (postId: number, accountId: number | undefined) =>
  [...getAuthorSummaryQueryKey(postId), { accountId }] as const;

/** A mutation may overtake even the first summary read. Cancel that snapshot before refetching. */
export async function invalidatePostEngagement(client: QueryClient, postId: number) {
  const filters: QueryFilters[] = [
    { queryKey: getPublicSummaryQueryKey(postId) },
    { queryKey: getAuthorSummaryQueryKey(postId) },
  ];
  await Promise.all(filters.map((filter) => client.cancelQueries(filter)));
  await Promise.all(filters.map((filter) => client.invalidateQueries(filter)));
}
