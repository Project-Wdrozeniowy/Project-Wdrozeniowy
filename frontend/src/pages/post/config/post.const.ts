export const POST_NOT_FOUND_TITLE = 'Post not found';
export const POST_NOT_FOUND_TEXT = 'This post does not exist or is no longer available.';
export const BACK_TO_FORUM_LABEL = 'Back to the forum';
export const POST_ERROR_TEXT = 'We could not load this post. Please try again.';
export const POST_LOADING_LABEL = 'Loading the post';

/** Badge text of the states a post can be in besides published; a pinned post has its own. */
export const POST_STATUS_LABELS = {
  LOCKED: 'locked',
  DRAFT: 'draft',
} as const;
export const POST_PINNED_LABEL = 'pinned';
