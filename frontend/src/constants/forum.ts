/** Posts per page in the forum feed. The API accepts 1–100. */
export const FEED_PAGE_SIZE = 10;

/**
 * Newest activity first. The API breaks ties by id, which keeps the order stable only while the
 * data does not change. With offset pagination, a post created (or a changed lastActivityAt)
 * between two page requests can repeat or skip a post; cursor pagination would be needed to
 * rule that out.
 */
export const FEED_SORT = 'lastActivityAt';

/** Voting, sharing and saving have no API yet, so they are disabled on real posts. */
export const VOTING_UNAVAILABLE_HINT = 'Voting is not available yet';
export const ACTION_UNAVAILABLE_HINT = 'Not available yet';

/** Badge text of a pinned post. */
export const PINNED_BADGE_LABEL = 'pinned';

/** Shown for every feed failure. Server messages are never exposed to users. */
export const FEED_ERROR_MESSAGE = 'We could not load the posts. Please try again.';
