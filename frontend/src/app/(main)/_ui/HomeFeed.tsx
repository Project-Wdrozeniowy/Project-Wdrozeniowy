'use client';

import Link from 'next/link';
import PostCard from '@/app/(main)/_ui/PostCard';
import { HOME_ALL_POSTS_LABEL, HOME_EMPTY_MESSAGE } from '@/app/(main)/_ui/homeFeed.const';
import { toPostCardData } from '@/app/(main)/_lib/postCard';
import PostFeedError from '@/app/(main)/_ui/PostFeedError';
import PostFeedSkeleton from '@/app/(main)/_ui/PostFeedSkeleton';
import { useForumPosts } from '@/shared/api/forum/useForumPosts';

/**
 * The newest posts on the home page: the first page of the forum feed, without pagination.
 * The rest of the posts are one link away on the forum page.
 */
export default function HomeFeed() {
  const { data, isPending, isLoadingError, isRefetchError, isFetching, refetch } = useForumPosts({
    page: 0,
  });

  if (isLoadingError) {
    return <PostFeedError onRetry={() => refetch()} retrying={isFetching} />;
  }
  if (isPending) {
    return <PostFeedSkeleton />;
  }

  return (
    <>
      {/* A failed refresh must not take away what the user is reading, nor look like "no posts". */}
      {isRefetchError && <PostFeedError onRetry={() => refetch()} retrying={isFetching} />}
      {data.content.length === 0 && !isRefetchError && (
        <p className="text-slate-400 text-sm">{HOME_EMPTY_MESSAGE}</p>
      )}
      <div className="flex flex-col gap-3">
        {data.content.map((post) => (
          <PostCard key={post.id} post={toPostCardData(post)} />
        ))}
      </div>
      {data.totalPages > 1 && (
        <Link
          href="/forum"
          className="self-start text-blue-400 hover:text-blue-300 text-sm font-semibold"
        >
          {HOME_ALL_POSTS_LABEL} →
        </Link>
      )}
    </>
  );
}
