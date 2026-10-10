/** Posts per page in the forum feed. The API accepts 1–100. */
export const FEED_PAGE_SIZE = 10;

/** Newest activity first; the API breaks ties by id, so pages never overlap. */
export const FEED_SORT = 'lastActivityAt';

/** Badge text of a pinned post. */
export const PINNED_BADGE_LABEL = 'pinned';

/** Shown for every feed failure. Server messages are never exposed to users. */
export const FEED_ERROR_MESSAGE = 'We could not load the posts. Please try again.';
