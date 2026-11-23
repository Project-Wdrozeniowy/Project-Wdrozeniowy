import type { UseQueryResult } from '@tanstack/react-query';
import { useAuthorSummary, usePublicSummary } from '@/shared/api/generated/orbita.api';
import type { AuthorSummaryQueryError } from '@/shared/api/generated/orbita.api';
import type { AuthorPostEngagementDto } from '@/shared/api/generated/models/authorPostEngagementDto.dto';
import type { PublicPostEngagementDto } from '@/shared/api/generated/models/publicPostEngagementDto.dto';
import { authorEngagementKey } from './postEngagement';

/** One permitted endpoint per viewer. The caller mounts this under the current post/account key. */
export function usePostEngagement(
  postId: number,
  accountId?: number
): UseQueryResult<PublicPostEngagementDto | AuthorPostEngagementDto, AuthorSummaryQueryError> {
  const publicQuery = usePublicSummary(postId, {
    query: { enabled: accountId === undefined, staleTime: 0, retry: false },
    request: { skipErrorToast: true },
  });
  const authorQuery = useAuthorSummary(postId, {
    query: {
      queryKey: authorEngagementKey(postId, accountId),
      enabled: accountId !== undefined,
      staleTime: 0,
      retry: false,
    },
    request: { skipErrorToast: true },
  });
  return accountId === undefined ? publicQuery : authorQuery;
}
