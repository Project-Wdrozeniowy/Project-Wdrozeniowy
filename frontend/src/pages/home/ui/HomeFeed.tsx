import { PostCard, PostFeedError, PostFeedSkeleton, toPostCardData } from '@/widgets/post-feed';
import { Link } from 'react-router';
import { HOME_ALL_POSTS_LABEL, HOME_EMPTY_MESSAGE } from '@/pages/home/config/homeFeed.const';
import { useForumPosts } from '@/shared/api/forum/useForumPosts';
import { getLoadPhase } from '@/shared/lib/loadPhase';

/**
 * The newest posts on the home page: the first page of the forum feed, without pagination.
 * The rest of the posts are one link away on the forum page.
 */
export default function HomeFeed() {
  const query = useForumPosts({ page: 0 });
  const { data, isRefetchError, isFetching, refetch } = query;
  const phase = getLoadPhase(query);

  // A retry keeps the error on screen, so the keyboard user keeps their place.
  if (phase === 'failed' || phase === 'retrying') {
    return <PostFeedError onRetry={() => refetch()} retrying={phase === 'retrying'} />;
  }
  if (phase === 'loading' || !data) {
    return <PostFeedSkeleton />;
  }

  return (
    <>
      {/* A failed refresh must not take away what the user is reading, nor look like "no posts". */}
      {isRefetchError && <PostFeedError onRetry={() => refetch()} retrying={isFetching} />}
      {data.content.length === 0 && !isRefetchError && (
        <p className="text-fg-subtle text-sm">{HOME_EMPTY_MESSAGE}</p>
      )}
      <div className="flex flex-col gap-3">
        {data.content.map((post) => (
          <PostCard key={post.id} post={toPostCardData(post)} />
        ))}
      </div>
      {data.totalPages > 1 && (
        <Link
          to="/forum"
          className="self-start text-accent hover:text-accent-hover text-sm font-semibold"
        >
          {HOME_ALL_POSTS_LABEL} →
        </Link>
      )}
    </>
  );
}
