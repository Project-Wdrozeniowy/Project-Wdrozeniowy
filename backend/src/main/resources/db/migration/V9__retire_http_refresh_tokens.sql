-- Coordinated PWDRZ-99 cutover: old refresh credentials must never restore REST authentication.
-- Historical migrations are immutable; product users/password hashes/content remain intact.
DROP TABLE refresh_tokens;
