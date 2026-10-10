'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import PostCard from '@/app/_components/PostCard';
import { ALL_TOPICS, isTopic } from '@/constants/categories';
import { useForumPosts } from '@/hooks/useForumPosts';
import { parsePageParam, topicToCategorySlug } from '@/lib/forumFeed';
import { toPostCardData } from '@/lib/postCard';
import CategoryFilter from './CategoryFilter';
import EmptyFeed from './EmptyFeed';
import PostFeedError from './PostFeedError';
import PostFeedSkeleton from './PostFeedSkeleton';
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

  return (
    <>
      <CategoryFilter active={activeTopic} onSelect={handleSelectTopic} />
      {isLoadingError ? (
        <PostFeedError onRetry={() => refetch()} retrying={isFetching} />
      ) : isPending ? (
        <PostFeedSkeleton />
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
          <div
            aria-busy={isPlaceholderData}
            className={isPlaceholderData ? 'flex flex-col gap-3 opacity-60' : 'flex flex-col gap-3'}
          >
            {data.content.map((post) => (
              <PostCard key={post.id} post={toPostCardData(post)} />
            ))}
          </div>
          <PostPagination
            // The URL is the source of truth: while the next page loads, the old posts stay
            // on screen but the indicator already shows where the user is going.
            page={page}
            totalPages={data.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </>
  );
}
