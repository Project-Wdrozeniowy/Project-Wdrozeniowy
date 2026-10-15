-- V6: Default forum categories; the frontend topic filter uses these slugs.
-- Rows whose name or slug already exists are left as they are.

INSERT INTO categories (name, slug, display_order) VALUES
    ('AI / Tech', 'ai',        1),
    ('Gaming',    'gaming',    2),
    ('Politics',  'politics',  3),
    ('Science',   'science',   4),
    ('Business',  'business',  5),
    ('Education', 'education', 6),
    ('News',      'news',      7)
ON CONFLICT DO NOTHING;
