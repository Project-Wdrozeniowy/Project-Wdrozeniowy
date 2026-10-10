package com.devpulse.forum.entity;

/** Lifecycle state of a comment; mirrors the {@code comment_status} database enum. */
public enum CommentStatus {

    /** Shown to everyone. */
    VISIBLE,

    /** Hidden by a moderator; excluded from public listings. */
    HIDDEN,

    /** Soft-deleted by its author or staff; listed as a placeholder so replies keep their context. */
    DELETED
}
