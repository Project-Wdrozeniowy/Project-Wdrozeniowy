-- V12: find the opening events that still identify a reader.
--
-- Openings (POST_VIEWED) and the GET-based reads that V10 kept as
-- POST_READ_LEGACY name their reader in user_id, and legacy rows may also
-- hold ip_address and metadata. OpeningDetailRetention clears those columns
-- once a row is older than app.analytics.opening-detail-retention and keeps
-- the row itself, so every count built on these rows stays as it was.
--
-- This partial index holds only the rows that still identify someone, so a
-- cleanup reads the eligible rows without scanning the cleared history, and
-- the index shrinks as rows are cleared.
--
-- PostgreSQL runs this file in one transaction: if it fails, nothing is
-- applied and the schema stays at V11 with all data intact.

CREATE INDEX idx_activity_identifiable_openings ON activity_events (created_at)
    WHERE event_type IN ('POST_VIEWED', 'POST_READ_LEGACY')
      AND (user_id IS NOT NULL OR ip_address IS NOT NULL OR metadata IS NOT NULL);
