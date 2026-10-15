/** Root of every cached feed page: `['forum-posts', { page, categorySlug }]`. */
export const FEED_QUERY_KEY = ['forum-posts'] as const;

/** Posts per page in the forum feed. The API accepts 1–100. */
export const FEED_PAGE_SIZE = 10;

/**
 * Newest activity first. The API breaks ties by id, which keeps the order stable only while the
 * data does not change. With offset pagination, a post created (or a changed lastActivityAt)
 * between two page requests can repeat or skip a post; cursor pagination would be needed to
 * rule that out.
 */
export const FEED_SORT = 'lastActivityAt';
