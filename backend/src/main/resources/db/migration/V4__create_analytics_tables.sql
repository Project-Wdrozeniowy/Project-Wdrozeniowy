-- V4: Analytics (user activity events)

CREATE TABLE activity_events (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     BIGINT               REFERENCES users(id) ON DELETE SET NULL,
    event_type  VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   BIGINT,
    metadata    JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN activity_events.event_type  IS 'e.g. POST_CREATED, COMMENT_ADDED, VOTE_CAST, USER_REGISTERED, POST_VIEWED';
COMMENT ON COLUMN activity_events.entity_type IS 'e.g. POST, COMMENT, USER';
COMMENT ON COLUMN activity_events.metadata    IS 'Arbitrary JSON payload for the event';

-- ─── metadata schemas per event_type ─────────────────────────────────────────
-- POST_VIEWED      : {"post_id": 101, "referrer": "https://..."}
-- POST_CREATED     : {"post_id": 101, "category_id": 3, "tag_count": 2}
-- COMMENT_ADDED    : {"comment_id": 55, "post_id": 101, "depth": 0}
-- VOTE_CAST        : {"entity_type": "POST", "entity_id": 101, "vote_type": "UP"}
-- USER_REGISTERED  : {"user_id": 42}
-- TAG_SUGGESTED    : {"post_id": 101, "tags": ["spring-boot", "java"], "ai_generated": true}
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_activity_user_id    ON activity_events(user_id);
CREATE INDEX idx_activity_event_type ON activity_events(event_type);
CREATE INDEX idx_activity_created_at ON activity_events(created_at DESC);
CREATE INDEX idx_activity_entity     ON activity_events(entity_type, entity_id);
