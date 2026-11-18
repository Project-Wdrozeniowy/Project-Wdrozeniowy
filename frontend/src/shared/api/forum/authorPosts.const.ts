/** Prefix of every "posts of one author" query (the profile's Posts tab). */
export const AUTHOR_POSTS_QUERY_KEY = ['author-posts'] as const;

/** Posts per request on the profile. The API accepts 1-100. */
export const AUTHOR_POSTS_PAGE_SIZE = 10;

/**
 * The API sorts every field descending and puts pinned posts first, so this is: pinned posts,
 * then the latest published. (It is a field name; the API has no direction parameter.)
 */
export const AUTHOR_POSTS_SORT = 'createdAt';
