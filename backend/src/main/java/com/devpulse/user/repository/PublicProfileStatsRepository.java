package com.devpulse.user.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Public counters exclude content that the reader cannot access. */
@Repository
@RequiredArgsConstructor
public class PublicProfileStatsRepository {
    private final JdbcTemplate jdbc;

    public record Counts(int posts, int comments) {}

    public Counts counts(long userId) {
        return jdbc.queryForObject("""
                WITH RECURSIVE readable AS (
                  SELECT c.id, c.post_id, c.user_id, c.status, 0 AS level
                  FROM comments c JOIN posts p ON p.id = c.post_id
                  WHERE c.parent_id IS NULL AND c.status IN ('VISIBLE', 'DELETED')
                    AND p.status IN ('PUBLISHED', 'LOCKED')
                  UNION ALL
                  SELECT c.id, c.post_id, c.user_id, c.status, r.level + 1
                  FROM comments c JOIN readable r ON c.parent_id = r.id AND c.post_id = r.post_id
                  WHERE c.status IN ('VISIBLE', 'DELETED') AND r.level < 5
                )
                SELECT
                  (SELECT count(*) FROM posts WHERE user_id = ?
                    AND status IN ('PUBLISHED', 'LOCKED')) AS posts,
                  (SELECT count(*) FROM readable WHERE user_id = ? AND status = 'VISIBLE') AS comments
                """, (rs, row) -> new Counts(Math.toIntExact(rs.getLong("posts")),
                        Math.toIntExact(rs.getLong("comments"))), userId, userId);
    }
}
