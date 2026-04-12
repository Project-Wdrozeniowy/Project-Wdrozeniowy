-- V2: Forum tables (posts, comments, tags, post_tags, votes)

CREATE TABLE posts (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title      VARCHAR(255) NOT NULL,
    content    TEXT         NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_user_id    ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

CREATE TABLE comments (
    id         BIGSERIAL   PRIMARY KEY,
    post_id    BIGINT      NOT NULL REFERENCES posts(id)  ON DELETE CASCADE,
    user_id    BIGINT      NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_post_id    ON comments(post_id);
CREATE INDEX idx_comments_user_id    ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

CREATE TABLE tags (
    id   BIGSERIAL   PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE post_tags (
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id  BIGINT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);

CREATE TYPE vote_type AS ENUM ('UP', 'DOWN');

CREATE TABLE votes (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    post_id    BIGINT               REFERENCES posts(id)     ON DELETE CASCADE,
    comment_id BIGINT               REFERENCES comments(id)  ON DELETE CASCADE,
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
