package com.devpulse.forum.entity;

/**
 * Status of a {@link Comment}, mirroring the PostgreSQL {@code comment_status}
 * enum defined in migration V2.
 */
public enum CommentStatus {

    /** Default — shown with its content and author. */
    VISIBLE,

    /** Removed by moderation; left out of listings together with its replies. */
    HIDDEN,

    /** Soft-deleted by its author or staff; listed as a placeholder without content or author. */
    DELETED
}
