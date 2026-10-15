-- V7: created_at and updated_at on every application table.
--
-- Existing rows: updated_at starts equal to created_at. tags had neither
-- column; a tag's created_at becomes the first time it was attached to a
-- post, or the migration time for a tag that was never attached.
--
-- updated_at changes whenever a row is updated. The trigger sets it only when
-- the UPDATE leaves it untouched, so a value written by the application
-- (Hibernate's @UpdateTimestamp) is kept, and bulk updates that bypass the
-- entities (token revocation, counters) still move it.
--
-- PostgreSQL runs this file in one transaction: if any statement fails,
-- nothing is applied and the schema stays at V6 with all data intact.

CREATE FUNCTION set_updated_at() RETURNS trigger
    LANGUAGE plpgsql AS
$$
BEGIN
    IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
        NEW.updated_at := now();
    END IF;
    RETURN NEW;
END;
$$;

-- Tables that already had created_at
ALTER TABLE categories         ADD COLUMN updated_at TIMESTAMPTZ;
ALTER TABLE refresh_tokens     ADD COLUMN updated_at TIMESTAMPTZ;
ALTER TABLE post_tags          ADD COLUMN updated_at TIMESTAMPTZ;
ALTER TABLE votes              ADD COLUMN updated_at TIMESTAMPTZ;
ALTER TABLE notifications      ADD COLUMN updated_at TIMESTAMPTZ;
ALTER TABLE post_subscriptions ADD COLUMN updated_at TIMESTAMPTZ;
ALTER TABLE activity_events    ADD COLUMN updated_at TIMESTAMPTZ;

UPDATE categories         SET updated_at = created_at;
UPDATE refresh_tokens     SET updated_at = created_at;
UPDATE post_tags          SET updated_at = created_at;
UPDATE votes              SET updated_at = created_at;
UPDATE notifications      SET updated_at = created_at;
UPDATE post_subscriptions SET updated_at = created_at;
UPDATE activity_events    SET updated_at = created_at;

-- tags had neither column
ALTER TABLE tags
    ADD COLUMN created_at TIMESTAMPTZ,
    ADD COLUMN updated_at TIMESTAMPTZ;

UPDATE tags t
SET created_at = coalesce((SELECT min(pt.created_at) FROM post_tags pt WHERE pt.tag_id = t.id), now());
UPDATE tags SET updated_at = created_at;

ALTER TABLE tags
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE categories         ALTER COLUMN updated_at SET DEFAULT now(), ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE refresh_tokens     ALTER COLUMN updated_at SET DEFAULT now(), ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE post_tags          ALTER COLUMN updated_at SET DEFAULT now(), ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE votes              ALTER COLUMN updated_at SET DEFAULT now(), ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE notifications      ALTER COLUMN updated_at SET DEFAULT now(), ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE post_subscriptions ALTER COLUMN updated_at SET DEFAULT now(), ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE activity_events    ALTER COLUMN updated_at SET DEFAULT now(), ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE tags               ALTER COLUMN updated_at SET DEFAULT now(), ALTER COLUMN updated_at SET NOT NULL;

-- One trigger per table, including the three that already had updated_at
CREATE TRIGGER users_set_updated_at              BEFORE UPDATE ON users              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER refresh_tokens_set_updated_at     BEFORE UPDATE ON refresh_tokens     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER categories_set_updated_at         BEFORE UPDATE ON categories         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER posts_set_updated_at              BEFORE UPDATE ON posts              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER comments_set_updated_at           BEFORE UPDATE ON comments           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tags_set_updated_at               BEFORE UPDATE ON tags               FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER post_tags_set_updated_at          BEFORE UPDATE ON post_tags          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER votes_set_updated_at              BEFORE UPDATE ON votes              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER notifications_set_updated_at      BEFORE UPDATE ON notifications      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER post_subscriptions_set_updated_at BEFORE UPDATE ON post_subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER activity_events_set_updated_at    BEFORE UPDATE ON activity_events    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
