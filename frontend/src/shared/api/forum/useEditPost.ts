import { useQueryClient } from '@tanstack/react-query';
import type { InfiniteData, QueryFilters } from '@tanstack/react-query';
import {
  getGetPostQueryKey,
  getListPostsQueryKey,
  getSearchQueryKey,
  getGetTrendingPostsQueryKey,
  getUpdatePostMutationKey,
  useUpdatePost,
} from '@/shared/api/generated/orbita.api';
import type { PostDto } from '@/shared/api/generated/models/postDto.dto';
import type { PostSummaryDto } from '@/shared/api/generated/models/postSummaryDto.dto';
import type { PagedResponsePostSummaryDto } from '@/shared/api/generated/models/pagedResponsePostSummaryDto.dto';
import type { SearchResultsDto } from '@/shared/api/generated/models/searchResultsDto.dto';
import type { MyProfileDto } from '@/shared/api/generated/models/myProfileDto.dto';
import { currentUserQueryKey } from '@/shared/api/profile/currentUser';
import { AUTHOR_POSTS_QUERY_KEY } from './authorPosts.const';
import { sessionEvents } from '@/shared/auth/sessionEvents';
import { useStore } from '@/store';

/** Server-confirmed text only: engagement may already be newer than the PATCH response. */
export function useEditPost(post: PostDto) {
  const client = useQueryClient();
  const accountId = () => client.getQueryData<MyProfileDto>(currentUserQueryKey)?.id;
  const filters: QueryFilters[] = [
    { queryKey: getGetPostQueryKey(post.slug) },
    { queryKey: getListPostsQueryKey() },
    { queryKey: AUTHOR_POSTS_QUERY_KEY },
    { queryKey: getSearchQueryKey() },
    { queryKey: getGetTrendingPostsQueryKey() },
  ];
  return useUpdatePost(
    {
      request: { skipErrorToast: true },
      mutation: {
        mutationKey: [...getUpdatePostMutationKey(), post.id],
        networkMode: 'always',
        retry: false,
        onMutate: () => ({ generation: sessionEvents.current(), accountId: accountId() }),
        onSuccess: async (saved, _variables, context) => {
          const stillCurrent = () =>
            context?.generation === sessionEvents.current() &&
            useStore.getState().isAuthenticated &&
            context.accountId === accountId();
          if (!stillCurrent()) return;
          await Promise.all(filters.map((filter) => client.cancelQueries(filter)));
          if (!stillCurrent()) return;
          const summary = (old: PostSummaryDto) =>
            old.id === saved.id
              ? {
                  ...old,
                  title: saved.title,
                  lastActivityAt: saved.lastActivityAt,
                }
              : old;
          const page = (old: PagedResponsePostSummaryDto) => ({
            ...old,
            content: old.content.map(summary),
          });
          client.setQueryData<PostDto>(getGetPostQueryKey(post.slug), (old) =>
            old
              ? {
                  ...old,
                  title: saved.title,
                  content: saved.content,
                  updatedAt: saved.updatedAt,
                  lastActivityAt: saved.lastActivityAt,
                }
              : old
          );
          client.setQueriesData<PagedResponsePostSummaryDto>(filters[1], (old) =>
            old ? page(old) : old
          );
          client.setQueriesData<InfiniteData<PagedResponsePostSummaryDto>>(filters[2], (old) =>
            old ? { ...old, pages: old.pages.map(page) } : old
          );
          client.setQueriesData<SearchResultsDto>(filters[3], (old) =>
            old ? { ...old, posts: old.posts ? page(old.posts) : old.posts } : old
          );
          client.setQueriesData<PostSummaryDto[]>(filters[4], (old) => old?.map(summary));
          for (const [index, filter] of filters.entries()) {
            // The detail already shows saved text and preserves fresh engagement. Lists need server ordering/filtering.
            void client.invalidateQueries({
              ...filter,
              refetchType: index === 0 ? 'none' : 'active',
            });
          }
        },
      },
    },
    client
  );
}
