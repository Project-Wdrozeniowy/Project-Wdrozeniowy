-- V3: Analytics tables (user activity events)

CREATE TABLE user_activity_events (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     BIGINT               REFERENCES users(id) ON DELETE SET NULL,
    event_type  VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   BIGINT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN user_activity_events.event_type  IS 'e.g. POST_CREATED, COMMENT_ADDED, VOTE_CAST, USER_REGISTERED';
COMMENT ON COLUMN user_activity_events.entity_type IS 'e.g. POST, COMMENT';
COMMENT ON COLUMN user_activity_events.metadata    IS 'Arbitrary JSON payload for the event';

CREATE INDEX idx_activity_user_id    ON user_activity_events(user_id);
CREATE INDEX idx_activity_event_type ON user_activity_events(event_type);
CREATE INDEX idx_activity_created_at ON user_activity_events(created_at DESC);
CREATE INDEX idx_activity_entity     ON user_activity_events(entity_type, entity_id);
