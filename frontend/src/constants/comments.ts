/** Matches the backend `@Size(max = 10_000)` on comment content. */
export const COMMENT_MAX_LENGTH = 10_000;

/** Deepest allowed nesting (the root comment is depth 0); matches the database constraint. */
export const MAX_COMMENT_DEPTH = 5;

export const COMMENTS_PAGE_SIZE = 20;
