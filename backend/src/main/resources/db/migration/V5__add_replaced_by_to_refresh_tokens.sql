-- V5: Track which refresh token replaced a rotated one

ALTER TABLE refresh_tokens
    ADD COLUMN replaced_by_token_id BIGINT NULL REFERENCES refresh_tokens(id);

CREATE INDEX idx_refresh_tokens_replaced_by ON refresh_tokens(replaced_by_token_id);
