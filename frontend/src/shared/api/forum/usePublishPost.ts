import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import {
  getCreatePostMutationOptions,
  getListPostsQueryKey,
} from '@/shared/api/generated/orbita.api';
import type { CreatePostMutationError } from '@/shared/api/generated/orbita.api';

type PublishPostOptions<TError, TContext> = Parameters<
  typeof getCreatePostMutationOptions<TError, TContext>
>[0];

/** Application cache policy on top of generated request/options/key definitions. */
export function getPublishPostMutationOptions<TError = CreatePostMutationError, TContext = unknown>(
  queryClient: QueryClient,
  options?: PublishPostOptions<TError, TContext>
) {
  const generated = getCreatePostMutationOptions<TError, TContext>(options);
  return {
    ...generated,
    onSuccess: (...args: Parameters<NonNullable<typeof generated.onSuccess>>) => {
      // Publishing succeeds before background feed refetches finish. A caller's own
      // callback still participates in TanStack Query's awaited mutation lifecycle.
      void queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
      return generated.onSuccess?.(...args);
    },
  };
}

export function usePublishPost<TError = CreatePostMutationError, TContext = unknown>(
  options?: PublishPostOptions<TError, TContext>
) {
  const queryClient = useQueryClient();
  return useMutation(getPublishPostMutationOptions<TError, TContext>(queryClient, options));
}
