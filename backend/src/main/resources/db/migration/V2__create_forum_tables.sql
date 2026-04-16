-- V2: Forum tables (categories, posts, comments, tags, post_tags, votes)

CREATE TYPE post_status    AS ENUM ('PUBLISHED', 'DRAFT', 'LOCKED', 'DELETED');
CREATE TYPE comment_status AS ENUM ('VISIBLE', 'HIDDEN', 'DELETED');
CREATE TYPE vote_type      AS ENUM ('UP', 'DOWN');

-- Forum sections / boards
CREATE TABLE categories (
    id            BIGSERIAL    PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    slug          VARCHAR(100) NOT NULL UNIQUE,
    description   TEXT,
    display_order INT          NOT NULL DEFAULT 0,
    is_visible    BOOLEAN      NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE posts (
    id               BIGSERIAL    PRIMARY KEY,
    user_id          BIGINT       NOT NULL REFERENCES users(id)       ON DELETE RESTRICT,
    category_id      BIGINT                REFERENCES categories(id)  ON DELETE SET NULL,
    title            VARCHAR(255) NOT NULL,
    slug             VARCHAR(300) NOT NULL UNIQUE,
    content          TEXT         NOT NULL,
    status           post_status  NOT NULL DEFAULT 'PUBLISHED',
    is_pinned        BOOLEAN      NOT NULL DEFAULT false,
    view_count       INT          NOT NULL DEFAULT 0,
    vote_score       INT          NOT NULL DEFAULT 0,
    comment_count    INT          NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_user_id       ON posts(user_id);
CREATE INDEX idx_posts_category_id   ON posts(category_id);
CREATE INDEX idx_posts_created_at    ON posts(created_at DESC);
CREATE INDEX idx_posts_last_activity ON posts(last_activity_at DESC);
CREATE INDEX idx_posts_vote_score    ON posts(vote_score DESC);

CREATE TABLE comments (
    id         BIGSERIAL      PRIMARY KEY,
    post_id    BIGINT         NOT NULL REFERENCES posts(id)    ON DELETE CASCADE,
    user_id    BIGINT         NOT NULL REFERENCES users(id)    ON DELETE RESTRICT,
    parent_id  BIGINT                  REFERENCES comments(id) ON DELETE CASCADE,
    content    TEXT           NOT NULL,
    status     comment_status NOT NULL DEFAULT 'VISIBLE',
    vote_score INT            NOT NULL DEFAULT 0,
    depth      SMALLINT       NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT comments_depth_check CHECK (depth <= 5)
);

CREATE INDEX idx_comments_post_id    ON comments(post_id);
CREATE INDEX idx_comments_user_id    ON comments(user_id);
CREATE INDEX idx_comments_parent_id  ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

CREATE TABLE tags (
    id         BIGSERIAL   PRIMARY KEY,
    name       VARCHAR(50) NOT NULL UNIQUE,
    slug       VARCHAR(50) NOT NULL UNIQUE,
    post_count INT         NOT NULL DEFAULT 0
);

CREATE TABLE post_tags (
    post_id    BIGINT      NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id     BIGINT      NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);

CREATE TABLE votes (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    post_id    BIGINT               REFERENCES posts(id)    ON DELETE CASCADE,
    comment_id BIGINT               REFERENCES comments(id) ON DELETE CASCADE,
    vote_type  vote_type   NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT votes_target_check    CHECK (
        (post_id IS NOT NULL)::int + (comment_id IS NOT NULL)::int = 1
    ),
    CONSTRAINT votes_unique_post    UNIQUE (user_id, post_id),
    CONSTRAINT votes_unique_comment UNIQUE (user_id, comment_id)
);

CREATE INDEX idx_votes_post_id    ON votes(post_id);
CREATE INDEX idx_votes_comment_id ON votes(comment_id);
CREATE INDEX idx_votes_user_id    ON votes(user_id);
