import { useGetPost } from '@/shared/api/generated/orbita.api';

/**
 * One post by its slug. Public: a guest may read a published post. A missing, deleted or draft
 * post (that the caller may not see) is a 404; the page shows its own message either way, so the
 * global toast must not print server text. No retry: a 404 will not go away by asking again.
 */
export function usePost(slug: string) {
  return useGetPost(slug, {
    query: { enabled: slug !== '', retry: false },
    request: { skipErrorToast: true },
  });
}
