-- V3: Notifications and post subscriptions

CREATE TYPE notification_type AS ENUM (
    'COMMENT_ON_POST',
    'REPLY_TO_COMMENT',
    'VOTE_ON_POST',
    'VOTE_ON_COMMENT',
    'MENTION',
    'POST_LOCKED',
    'SYSTEM'
);

CREATE TABLE notifications (
    id           BIGSERIAL         PRIMARY KEY,
    recipient_id BIGINT            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id    BIGINT                     REFERENCES users(id) ON DELETE SET NULL,
    type         notification_type NOT NULL,
    entity_type  VARCHAR(50),
    entity_id    BIGINT,
    message      TEXT,
    is_read      BOOLEAN           NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient    ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread       ON notifications(recipient_id) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at   ON notifications(created_at DESC);

-- Users subscribing to post threads (for WebSocket room management and notifications)
CREATE TABLE post_subscriptions (
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id    BIGINT      NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_post_subscriptions_post_id ON post_subscriptions(post_id);
