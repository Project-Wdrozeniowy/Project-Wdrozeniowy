package com.devpulse.forum.entity;

/**
 * Lifecycle status of a forum {@link Post}, mirroring the PostgreSQL
 * {@code post_status} enum defined in migration V2.
 */
public enum PostStatus {

    /** Default — visible to every reader. */
    PUBLISHED,

    /** Author is still working on the post; hidden from public lists. */
    DRAFT,

    /** Comments and edits are disabled by a moderator. */
    LOCKED,

    /** Soft-deleted; not returned to non-staff users. */
    DELETED
}
