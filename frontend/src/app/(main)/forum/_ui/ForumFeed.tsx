'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import PostCard from '@/app/(main)/_ui/PostCard';
import { ALL_TOPICS, isTopic } from '@/shared/constants/categories.const';
import { useForumPosts } from '@/shared/api/forum/useForumPosts';
import { parsePageParam, topicToCategorySlug } from '@/app/(main)/forum/_lib/forumFeed';
import { toPostCardData } from '@/app/(main)/_lib/postCard';
import CategoryFilter from './CategoryFilter';
import EmptyFeed from './EmptyFeed';
import PostFeedError from '@/app/(main)/_ui/PostFeedError';
import PostFeedSkeleton from '@/app/(main)/_ui/PostFeedSkeleton';
import PostPagination from './PostPagination';

/**
 * Forum post list backed by `GET /forum/posts`.
 * The topic (`?topic=`) and the page (`?page=`, 1-based) live in the URL, so they are linkable,
 * survive a reload and work with the Back button.
 */
export default function ForumFeed() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const topicParam = searchParams.get('topic');
  const activeTopic = isTopic(topicParam) ? topicParam : ALL_TOPICS;
  const page = parsePageParam(searchParams.get('page'));
  const categorySlug = activeTopic === ALL_TOPICS ? undefined : topicToCategorySlug(activeTopic);

  const {
    data,
    isPending,
    isLoadingError,
    isRefetchError,
    isFetching,
    isPlaceholderData,
    refetch,
  } = useForumPosts({ page, categorySlug });

  function navigate(update: (params: URLSearchParams) => void, mode: 'push' | 'replace') {
    const params = new URLSearchParams(searchParams.toString());
    update(params);
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    if (mode === 'push') {
      router.push(url);
    } else {
      router.replace(url, { scroll: false });
    }
  }

  function handleSelectTopic(label: string) {
    navigate((params) => {
      if (label === ALL_TOPICS) {
        params.delete('topic');
      } else {
        params.set('topic', label);
      }
      // A different topic has a different number of pages.
      params.delete('page');
    }, 'replace');
  }

  function handlePageChange(nextPage: number) {
    navigate((params) => {
      if (nextPage <= 0) {
        params.delete('page');
      } else {
        params.set('page', String(nextPage + 1));
      }
    }, 'push');
  }

  // The pagination has its own fixed slot below the content, so it is the same element while the
  // content changes between the posts and the loading state. That keeps keyboard focus on it.
  const loadingAnotherPage = !isLoadingError && !isPending && isPlaceholderData;
  const showPagination =
    !isLoadingError &&
    !isPending &&
    (loadingAnotherPage || (data.content.length > 0 && !isPlaceholderData));

  return (
    <>
      <CategoryFilter active={activeTopic} onSelect={handleSelectTopic} />
      {isLoadingError ? (
        <PostFeedError onRetry={() => refetch()} retrying={isFetching} />
      ) : isPending ? (
        // First load or a new topic: nothing to show yet.
        <PostFeedSkeleton />
      ) : loadingAnotherPage ? (
        // Another page of the same topic is loading. The previous page's posts are not shown,
        // they would look like this page.
        <PostFeedSkeleton label={`Loading page ${page + 1}…`} />
      ) : data.content.length === 0 ? (
        <EmptyFeed
          topic={activeTopic}
          pageOutOfRange={page > 0 && data.totalPages > 0}
          onFirstPage={() => handlePageChange(0)}
        />
      ) : (
        <>
          {/* A failed refresh must not take away what the user is reading. */}
          {isRefetchError && <PostFeedError onRetry={() => refetch()} retrying={isFetching} />}
          <div className="flex flex-col gap-3">
            {data.content.map((post) => (
              <PostCard key={post.id} post={toPostCardData(post)} />
            ))}
          </div>
        </>
      )}
      {showPagination && (
        <PostPagination
          page={page}
          totalPages={data.totalPages}
          onPageChange={handlePageChange}
          busy={loadingAnotherPage}
        />
      )}
    </>
  );
}
