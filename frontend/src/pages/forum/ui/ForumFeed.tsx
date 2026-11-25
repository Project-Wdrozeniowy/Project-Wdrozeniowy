import { PostCard, PostFeedError, PostFeedSkeleton, toPostCardData } from '@/widgets/post-feed';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { ALL_TOPICS, isTopic } from '@/shared/constants/categories.const';
import { FEED_SORT } from '@/shared/api/forum/feedQuery.const';
import { FEED_SORTS, FEED_SORT_PARAM } from '@/shared/constants/feedSort.const';
import { feedSortToApi, openFeedSort } from '@/shared/lib/feedSort';
import { useForumPosts } from '@/shared/api/forum/useForumPosts';
import { parsePublicationFilters } from '@/features/publication-drilldown';
import { getLoadPhase } from '@/shared/lib/loadPhase';
import { parsePageParam, parseTagParam, topicToCategorySlug } from '@/pages/forum/lib/forumFeed';
import ActiveSortFilter from './ActiveSortFilter';
import ActiveTagFilter from './ActiveTagFilter';
import CategoryFilter from './CategoryFilter';
import EmptyFeed from './EmptyFeed';
import PostPagination from './PostPagination';
import ActivePublicationFilters from './ActivePublicationFilters';

/**
 * Forum post list backed by `GET /forum/posts`.
 * The topic (`?topic=`), the tag (`?tag=`, a tag slug) and the page (`?page=`, 1-based) live in the
 * URL, so they are linkable,
 * survive a reload and work with the Back button.
 */
export default function ForumFeed() {
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const [searchParams] = useSearchParams();

  const topicParam = searchParams.get('topic');
  const activeTopic = isTopic(topicParam) ? topicParam : ALL_TOPICS;
  const tag = parseTagParam(searchParams.get('tag'));
  const page = parsePageParam(searchParams.get('page'));
  // The order comes from the home page's "See all posts" (`?sort=`); the forum has no picker.
  // Without a usable one the forum is what it was: the most recent activity first.
  const sortParam = openFeedSort(searchParams.get(FEED_SORT_PARAM));
  const sort = sortParam ? feedSortToApi(sortParam) : FEED_SORT;
  const categorySlug = activeTopic === ALL_TOPICS ? undefined : topicToCategorySlug(activeTopic);

  const publication = parsePublicationFilters(searchParams);
  const filters = publication.valid ? publication.filters : {};
  const hasPublicationFilter = Object.keys(filters).length > 0;
  const query = useForumPosts({ page, categorySlug, tag, sort, ...filters }, publication.valid);
  const { data, isRefetchError, isFetching, isPlaceholderData, refetch } = query;
  const phase = getLoadPhase(query);
  const failed = phase === 'failed' || phase === 'retrying';
  const loadingFirst = phase === 'loading' || !data;

  function updateLocation(update: (params: URLSearchParams) => void, mode: 'push' | 'replace') {
    const params = new URLSearchParams(searchParams.toString());
    update(params);
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    if (mode === 'push') {
      navigate(url);
    } else {
      navigate(url, { replace: true, preventScrollReset: true });
    }
  }

  function handleSelectTopic(label: string) {
    updateLocation((params) => {
      for (const key of ['categoryId', 'categoryName', 'uncategorized', 'topic', 'page']) {
        params.delete(key);
      }
      if (label === ALL_TOPICS) {
        params.delete('topic');
      } else {
        params.set('topic', label);
      }
      // A different topic has a different number of pages.
      params.delete('page');
    }, 'replace');
  }

  function hrefWithoutTag() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('tag');
    params.delete('page');
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function hrefWithoutSort() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(FEED_SORT_PARAM);
    params.delete('page');
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function handlePageChange(nextPage: number) {
    updateLocation((params) => {
      if (nextPage <= 0) {
        params.delete('page');
      } else {
        params.set('page', String(nextPage + 1));
      }
    }, 'push');
  }

  // The pagination has its own fixed slot below the content, so it is the same element while the
  // content changes between the posts and the loading state. That keeps keyboard focus on it.
  const loadingAnotherPage = !failed && !loadingFirst && isPlaceholderData;
  const showPagination =
    publication.valid &&
    !failed &&
    !loadingFirst &&
    (loadingAnotherPage || (data.content.length > 0 && !isPlaceholderData));

  return (
    <>
      <CategoryFilter
        active={filters.categoryId !== undefined || filters.uncategorized ? null : activeTopic}
        onSelect={handleSelectTopic}
      />
      <ActivePublicationFilters
        params={searchParams}
        posts={isPlaceholderData ? [] : (data?.content ?? [])}
      />
      {tag && <ActiveTagFilter tag={tag} clearHref={hrefWithoutTag()} />}
      {sortParam && (
        <ActiveSortFilter
          description={FEED_SORTS.find((option) => option.id === sortParam)?.description ?? ''}
          clearHref={hrefWithoutSort()}
        />
      )}
      {!publication.valid ? null : failed ? (
        // A retry keeps the error on screen, so the keyboard user keeps their place.
        <PostFeedError onRetry={() => refetch()} retrying={phase === 'retrying'} />
      ) : loadingFirst ? (
        // First load or a new topic: nothing to show yet.
        <PostFeedSkeleton />
      ) : loadingAnotherPage ? (
        // Another page of the same topic is loading. The previous page's posts are not shown,
        // they would look like this page.
        <PostFeedSkeleton label={`Loading page ${page + 1}…`} />
      ) : data.content.length === 0 ? (
        <EmptyFeed
          topic={activeTopic}
          tag={tag}
          publicationFiltered={hasPublicationFilter}
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
