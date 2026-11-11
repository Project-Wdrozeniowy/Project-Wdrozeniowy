-- V10: post views become intentional openings reported by the client.
--
-- POST_VIEWED rows now carry opening_id, chosen by the client for one opening
-- and reused when it retries, so a retry cannot count twice. It identifies the
-- opening only, never the reader.
--
-- Earlier POST_VIEWED rows were written by every GET of a post, including
-- prefetches and refreshes, so they are not openings. They are kept under
-- their own event type and no longer count anywhere: collection of openings
-- starts when this migration runs, and every post starts from zero.
--
-- PostgreSQL runs this file in one transaction: if any statement fails,
-- nothing is applied and the schema stays at V9 with all data intact.

ALTER TABLE activity_events ADD COLUMN opening_id UUID;

COMMENT ON COLUMN activity_events.opening_id IS 'POST_VIEWED: client-chosen id of one opening, unique; NULL for other events';

CREATE UNIQUE INDEX ux_activity_opening_id ON activity_events(opening_id) WHERE opening_id IS NOT NULL;

UPDATE activity_events SET event_type = 'POST_READ_LEGACY' WHERE event_type = 'POST_VIEWED';

UPDATE posts SET view_count = 0 WHERE view_count <> 0;

-- An opening is not a change to the post, so it must not move posts.updated_at.
DROP TRIGGER posts_set_updated_at ON posts;

CREATE TRIGGER posts_set_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    WHEN (OLD.view_count IS NOT DISTINCT FROM NEW.view_count
          OR to_jsonb(OLD) - 'view_count' IS DISTINCT FROM to_jsonb(NEW) - 'view_count')
    EXECUTE FUNCTION set_updated_at();
