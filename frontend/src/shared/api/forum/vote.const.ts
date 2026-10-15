/** Messages for a failed vote. Server texts are never shown to the user. */
export const VOTE_ERROR_MESSAGE = 'We could not save your vote. Please try again.';
export const VOTE_LOCKED_MESSAGE = 'This post is locked, so it cannot be voted on.';
export const VOTE_GONE_MESSAGE = 'This post or your vote no longer exists. The list was refreshed.';
/** A 409 means a concurrent change or a post that is a draft: the same advice fits both. */
export const VOTE_CONFLICT_MESSAGE =
  'Your vote could not be saved right now. The list was refreshed, please try again.';
