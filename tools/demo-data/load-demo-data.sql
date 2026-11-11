-- Synthetic analytics exploration dataset for an owned demo database (PWDRZ-187).
--
-- Every account, post, comment, vote and opening below is invented. Accounts
-- use the reserved domain demo.orbita.invalid and are named "(synthetic)";
-- posts start with "[Demo]". Never load this into a database with real users.
--
-- Usage (see tools/demo-data/README.md):
--   psql -d orbita_demo -v confirm=orbita_demo [-v anchor=YYYY-MM-DD] -f tools/demo-data/load-demo-data.sql
--
-- The database must be named *_demo, be named again in "confirm", be migrated
-- to Flyway V10 or later, and hold no account outside demo.orbita.invalid.
-- Otherwise the script stops before changing anything. Each run replaces the
-- whole forum content of the database, so loading twice gives the same data.
--
-- History covers the 69 UTC days before the anchor day (default: today in
-- UTC). The anchor day itself stays empty, so the figures do not depend on the
-- time of loading. Everything runs in one transaction.

\set ON_ERROR_STOP on

\if :{?confirm}
\else
\echo 'Refusing: pass -v confirm=<database name> to load the synthetic demo dataset.'
SELECT 1 / 0 AS confirm_is_required;
\endif

\if :{?anchor}
\else
\set anchor ''
\endif

BEGIN;

CREATE TEMP TABLE demo_settings ON COMMIT DROP AS
SELECT :'confirm'::text AS confirm,
       coalesce(nullif(:'anchor', '')::date, (now() AT TIME ZONE 'UTC')::date) AS anchor;

DO $$
DECLARE
    settings     demo_settings;
    schema_level int;
    foreign_accounts bigint;
BEGIN
    SELECT * INTO settings FROM demo_settings;
    IF current_database() !~ '_demo$' THEN
        RAISE EXCEPTION 'Refusing: database % is not a demo database (its name must end with _demo)', current_database();
    END IF;
    IF settings.confirm IS DISTINCT FROM current_database() THEN
        RAISE EXCEPTION 'Refusing: confirm=% does not name the target database %', settings.confirm, current_database();
    END IF;
    IF to_regclass('flyway_schema_history') IS NULL THEN
        RAISE EXCEPTION 'Refusing: % has no Flyway history; start the backend on it once first', current_database();
    END IF;
    SELECT max(version::int) INTO schema_level FROM flyway_schema_history WHERE success AND version IS NOT NULL;
    IF schema_level IS NULL OR schema_level < 10 THEN
        RAISE EXCEPTION 'Refusing: % is at schema V%, the dataset needs V10 or later', current_database(), schema_level;
    END IF;
    SELECT count(*) INTO foreign_accounts FROM users WHERE email NOT LIKE '%@demo.orbita.invalid';
    IF foreign_accounts > 0 THEN
        RAISE EXCEPTION 'Refusing: % account(s) in % are not synthetic; recreate the demo database to reset it',
            foreign_accounts, current_database();
    END IF;
END
$$;

-- Previous synthetic content, signed-in sessions included.
DELETE FROM spring_session;
DELETE FROM activity_events;
DELETE FROM notifications;
DELETE FROM post_subscriptions;
DELETE FROM votes;
DELETE FROM comments;
DELETE FROM post_tags;
DELETE FROM posts;
DELETE FROM tags;
DELETE FROM users;

-- The seven default categories (V6), visible and as first seeded.
DELETE FROM categories WHERE slug NOT IN ('ai', 'gaming', 'politics', 'science', 'business', 'education', 'news');
UPDATE categories SET name = name || ' #' || id;
INSERT INTO categories (name, slug, description, display_order, is_visible)
VALUES ('AI / Tech', 'ai', NULL, 1, true),
       ('Gaming', 'gaming', NULL, 2, true),
       ('Politics', 'politics', NULL, 3, true),
       ('Science', 'science', NULL, 4, true),
       ('Business', 'business', NULL, 5, true),
       ('Education', 'education', NULL, 6, true),
       ('News', 'news', NULL, 7, true)
ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name, description = NULL, display_order = EXCLUDED.display_order, is_visible = true;

-- Accounts: ten members (1-10) and one administrator. Password of all: see README.
CREATE TEMP TABLE demo_users ON COMMIT DROP AS
SELECT n AS member, name
FROM unnest(ARRAY['ana', 'ben', 'cleo', 'dan', 'eva', 'finn', 'gia', 'hugo', 'iris', 'jon', 'admin'])
     WITH ORDINALITY AS u(name, n);

INSERT INTO users (username, email, password_hash, display_name, bio, role, created_at)
SELECT 'demo_' || u.name,
       'demo_' || u.name || '@demo.orbita.invalid',
       '$2a$10$QYURAD2mZNGS9cpmgch2MuADiZoj4.FWkeV8zZW/g1minexON5UpK',
       initcap(u.name) || ' (synthetic)',
       'Synthetic demonstration account; not a real person.',
       CASE WHEN u.name = 'admin' THEN 'ADMIN' ELSE 'USER' END::user_role,
       (s.anchor - 75)::timestamp AT TIME ZONE 'UTC'
FROM demo_users u, demo_settings s;

CREATE TEMP TABLE demo_user_ids ON COMMIT DROP AS
SELECT u.member, x.id
FROM demo_users u JOIN users x ON x.username = 'demo_' || u.name;

-- Days before the anchor and their post counts: quiet days, two peaks.
CREATE TEMP TABLE demo_days ON COMMIT DROP AS
SELECT k,
       CASE
           WHEN k IN (9, 10, 11, 25, 41, 42, 55) THEN 0
           WHEN k = 3 THEN 9
           WHEN k = 34 THEN 7
           ELSE 1 + (k * 7) % 4
       END AS posts
FROM generate_series(1, 69) AS k;

CREATE TEMP TABLE demo_posts ON COMMIT DROP AS
SELECT d.k, j,
       1 + (d.k * 3 + j) % 8 AS author,
       (d.k + 2 * j) % 8 AS category,
       CASE
           WHEN (d.k * 5 + j) % 23 = 0 THEN 'DRAFT'
           WHEN (d.k * 5 + j) % 23 = 11 THEN 'DELETED'
           WHEN (d.k * 5 + j) % 29 = 7 THEN 'LOCKED'
           ELSE 'PUBLISHED'
       END AS status,
       ((s.anchor - d.k)::timestamp AT TIME ZONE 'UTC') + interval '6 hours' + j * interval '47 minutes' AS created_at
FROM demo_days d
CROSS JOIN demo_settings s
CROSS JOIN LATERAL generate_series(0, d.posts - 1) AS j;

INSERT INTO posts (user_id, category_id, title, slug, content, status, created_at, last_activity_at)
SELECT a.id,
       c.id,
       '[Demo] ' || coalesce(c.name, 'Uncategorized') || ' discussion ' || p.k || '.' || p.j,
       'demo-' || p.k || '-' || p.j,
       'Synthetic demonstration content generated by tools/demo-data/load-demo-data.sql. '
           || 'It is not written by a real person.',
       p.status::post_status,
       p.created_at,
       p.created_at
FROM demo_posts p
JOIN demo_user_ids a ON a.member = p.author
LEFT JOIN categories c ON c.slug = (ARRAY['ai', 'gaming', 'politics', 'science', 'business', 'education', 'news'])[p.category];

CREATE TEMP TABLE demo_post_ids ON COMMIT DROP AS
SELECT p.*, x.id, p.status IN ('PUBLISHED', 'LOCKED') AS public
FROM demo_posts p JOIN posts x ON x.slug = 'demo-' || p.k || '-' || p.j;

-- Tags: one to three of six per post.
INSERT INTO tags (name, slug, created_at)
SELECT t.name, t.name, (s.anchor - 75)::timestamp AT TIME ZONE 'UTC'
FROM unnest(ARRAY['java', 'spring-boot', 'postgresql', 'react', 'analytics', 'testing']) AS t(name), demo_settings s;

INSERT INTO post_tags (post_id, tag_id, created_at, updated_at)
SELECT p.id, t.id, p.created_at, p.created_at
FROM demo_post_ids p
CROSS JOIN generate_series(1, 6) AS n
JOIN tags t ON t.slug = (ARRAY['java', 'spring-boot', 'postgresql', 'react', 'analytics', 'testing'])[n]
WHERE n = 1 + (p.k + p.j) % 6 OR (p.k + p.j + n) % 4 = 0;

-- Comments on every post except drafts, on the post day and the days after; none on quiet days.
INSERT INTO comments (post_id, user_id, content, status, created_at, updated_at)
SELECT p.id, a.id,
       'Synthetic demonstration comment.',
       CASE
           WHEN (p.k + p.j + i) % 13 = 0 THEN 'HIDDEN'
           WHEN (p.k + p.j + i) % 17 = 5 THEN 'DELETED'
           ELSE 'VISIBLE'
       END::comment_status,
       c.created_at, c.created_at
FROM demo_post_ids p
CROSS JOIN demo_settings s
CROSS JOIN LATERAL generate_series(0, (p.k + 3 * p.j) % 4 - 1) AS i
CROSS JOIN LATERAL (SELECT ((s.anchor - (p.k - i))::timestamp AT TIME ZONE 'UTC') + interval '15 hours'
                               + i * interval '13 minutes' + p.j * interval '3 minutes' AS created_at) c
JOIN demo_user_ids a ON a.member = 1 + (p.k + p.j + i + 4) % 10
WHERE p.status <> 'DRAFT'
  AND p.k - i >= 1
  AND p.k - i NOT IN (SELECT k FROM demo_days WHERE posts = 0);

-- Votes on public posts by other members.
INSERT INTO votes (user_id, post_id, vote_type, created_at, updated_at)
SELECT v.id, p.id,
       CASE WHEN (p.k + v.member) % 4 = 0 THEN 'DOWN' ELSE 'UP' END::vote_type,
       p.created_at + interval '1 hour' + v.member * interval '1 minute',
       p.created_at + interval '1 hour' + v.member * interval '1 minute'
FROM demo_post_ids p
JOIN demo_user_ids v ON v.member BETWEEN 1 AND 10 AND v.member <> p.author
WHERE p.public AND (p.k * p.j + v.member) % 3 = 0;

-- Openings of public posts on the post day and the two days after, with two peaks.
INSERT INTO activity_events (user_id, event_type, entity_type, entity_id, opening_id, created_at, updated_at)
SELECT r.id, 'POST_VIEWED', 'POST', p.id,
       md5('orbita-demo-opening:' || p.k || ':' || p.j || ':' || t)::uuid,
       o.created_at, o.created_at
FROM demo_post_ids p
CROSS JOIN demo_settings s
CROSS JOIN LATERAL generate_series(0,
        CASE WHEN p.k = 3 AND p.j = 0 THEN 40 WHEN p.k = 34 AND p.j = 0 THEN 25 ELSE 1 + (p.k + p.j) % 5 END - 1) AS t
CROSS JOIN LATERAL (SELECT ((s.anchor - (p.k - t % 3))::timestamp AT TIME ZONE 'UTC') + interval '16 hours'
                               + t * interval '1 minute' AS created_at) o
LEFT JOIN demo_user_ids r ON t % 3 = 0 AND r.member = 1 + (p.k + t) % 10
WHERE p.public AND p.k - t % 3 >= 1;

-- Counters as the application keeps them; updated_at as of creation.
UPDATE posts x
SET view_count = (SELECT count(*) FROM activity_events e WHERE e.event_type = 'POST_VIEWED' AND e.entity_id = x.id),
    comment_count = (SELECT count(*) FROM comments c WHERE c.post_id = x.id AND c.status <> 'DELETED'),
    vote_score = (SELECT coalesce(sum(CASE WHEN v.vote_type = 'UP' THEN 1 ELSE -1 END), 0)
                  FROM votes v WHERE v.post_id = x.id),
    last_activity_at = greatest(x.created_at, (SELECT max(c.created_at) FROM comments c
                                               WHERE c.post_id = x.id AND c.status <> 'DELETED')),
    updated_at = x.created_at;

UPDATE users x
SET post_count = (SELECT count(*) FROM posts p WHERE p.user_id = x.id AND p.status IN ('PUBLISHED', 'LOCKED')),
    comment_count = (SELECT count(*) FROM comments c WHERE c.user_id = x.id AND c.status <> 'DELETED'),
    updated_at = x.created_at;

UPDATE tags x
SET post_count = (SELECT count(*) FROM post_tags pt JOIN posts p ON p.id = pt.post_id
                  WHERE pt.tag_id = x.id AND p.status IN ('PUBLISHED', 'LOCKED')),
    updated_at = x.created_at;

SELECT anchor AS anchor_day,
       (SELECT count(*) FROM users) AS accounts,
       (SELECT count(*) FROM posts) AS posts,
       (SELECT count(*) FROM comments) AS comments,
       (SELECT count(*) FROM votes) AS votes,
       (SELECT count(*) FROM activity_events) AS openings
FROM demo_settings;

COMMIT;
