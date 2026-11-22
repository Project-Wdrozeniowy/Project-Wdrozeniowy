import { PostCard, PostFeedError, PostFeedSkeleton, toPostCardData } from '@/widgets/post-feed';
import { Link } from 'react-router';
import { HOME_ALL_POSTS_LABEL, HOME_EMPTY_MESSAGE } from '@/pages/home/config/homeFeed.const';
import { useForumPosts } from '@/shared/api/forum/useForumPosts';
import type { OpenFeedSortId } from '@/shared/constants/feedSort.const';
import { feedSortHref, feedSortToApi } from '@/shared/lib/feedSort';
import { getLoadPhase } from '@/shared/lib/loadPhase';

interface HomeFeedProps {
  /** The order the user picked. The server sorts: nothing here reorders the posts it returned. */
  sort: OpenFeedSortId;
}

/**
 * The first page of the forum feed in the picked order, without pagination. The rest of the posts
 * are one link away on the forum page, in the same order.
 */
export default function HomeFeed({ sort }: HomeFeedProps) {
  const query = useForumPosts({ page: 0, sort: feedSortToApi(sort) });
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
          to={feedSortHref('/forum', sort)}
          className="self-start text-accent hover:text-accent-hover text-sm font-semibold"
        >
          {HOME_ALL_POSTS_LABEL} →
        </Link>
      )}
    </>
  );
}
