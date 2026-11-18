-- V11: when the collection of each analytics event type started.
--
-- A day before collection started has no data, which is not the same as a
-- day on which nothing happened. Reports read the start from here to tell
-- the two apart instead of showing 0 for days that were never measured.
--
-- Openings (POST_VIEWED) are collected from V10 on. A database that already
-- recorded openings starts from its first one, which is when collection is
-- known to have been running; any other database starts now.
--
-- PostgreSQL runs this file in one transaction: if any statement fails,
-- nothing is applied and the schema stays at V10 with all data intact.

CREATE TABLE analytics_collection_starts (
    event_type     VARCHAR(50) PRIMARY KEY,
    collected_from TIMESTAMPTZ NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER analytics_collection_starts_set_updated_at
    BEFORE UPDATE ON analytics_collection_starts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE analytics_collection_starts IS 'First instant from which events of this activity_events.event_type are recorded';

INSERT INTO analytics_collection_starts (event_type, collected_from)
SELECT 'POST_VIEWED', coalesce(min(created_at), now())
FROM activity_events
WHERE event_type = 'POST_VIEWED';
