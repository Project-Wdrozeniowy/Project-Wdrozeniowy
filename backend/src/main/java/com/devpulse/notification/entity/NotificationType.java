package com.devpulse.notification.entity;

/**
 * What a {@link Notification} is about, mirroring the PostgreSQL
 * {@code notification_type} enum defined in migration V3.
 */
public enum NotificationType {

    /** Someone commented on the recipient's post or on a post they follow. */
    COMMENT_ON_POST,

    /** Someone replied to the recipient's comment. */
    REPLY_TO_COMMENT,

    /** Someone voted on the recipient's post. */
    VOTE_ON_POST,

    /** Someone voted on the recipient's comment. */
    VOTE_ON_COMMENT,

    /** Someone mentioned the recipient. */
    MENTION,

    /** A moderator locked the recipient's post. */
    POST_LOCKED,

    /** A message from the platform itself, without a sender. */
    SYSTEM
}
