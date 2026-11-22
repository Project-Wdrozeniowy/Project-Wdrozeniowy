import { ListPostsSort } from '@/shared/api/generated/models/listPostsSort.dto';

/**
 * The orders of the post feed, as the home page names them (`?sort=new|top`) and as the API
 * (`GET /forum/posts?sort=`) offers them: all highest first, ties by id, pinned posts first.
 *
 * - new: `createdAt`, the newest post first.
 * - top: `voteScore`, the highest score first, of all time (there is no window to pick).
 * - hot: PROVISIONAL, shown and not open. A "hot" order needs a ranking contract that does not
 *   exist: `lastActivityAt` only moves when a post is created or edited (comments and votes do not
 *   touch it), so it would be "new" under another name, and `GET /analytics/trending-posts` ranks
 *   by views + 2 x votes + 3 x comments in a window but lists a limit of posts without paging and
 *   without what a card needs (author, tags, the user's vote). It is a backend/product decision,
 *   with no ticket yet, to be agreed before this tab is opened (for example `sort=hot`, paged, on
 *   `GET /forum/posts`).
 *
 * Nothing here sorts loaded posts on the client: an order is always a request.
 */
export const FEED_SORTS = [
  { id: 'hot', label: 'Hot', available: false, description: 'Not available yet' },
  {
    id: 'new',
    label: 'New',
    available: true,
    apiSort: ListPostsSort.createdAt,
    description: 'The newest posts first',
  },
  {
    id: 'top',
    label: 'Top',
    available: true,
    apiSort: ListPostsSort.voteScore,
    description: 'The highest score first, of all time',
  },
] as const;

export type FeedSortId = (typeof FEED_SORTS)[number]['id'];
/** Derived, so an order cannot be marked available without an API sort behind it. */
export type OpenFeedSortId = Extract<(typeof FEED_SORTS)[number], { available: true }>['id'];

/** The order of a link without `?sort=`. */
export const DEFAULT_FEED_SORT: OpenFeedSortId = 'new';

export const FEED_SORT_PARAM = 'sort';
export const FEED_SORT_LABEL = 'Sort posts';
export const FEED_SORT_UNAVAILABLE_LABEL = 'Not available yet';
export const FEED_SORT_CLEAR_LABEL = 'Back to the usual order';
