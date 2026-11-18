package com.devpulse.analytics.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.Optional;

/** Access and aggregates share one PostgreSQL statement snapshot. */
@Repository
@RequiredArgsConstructor
public class PostEngagementRepository {
    private final JdbcTemplate jdbc;

    public record Engagement(long postId, long views, long comments, int score,
                             OffsetDateTime collectedFrom, long upvotes, long downvotes) {}

    public Optional<Engagement> publicEngagement(long postId) {
        return query(postId, null);
    }

    public Optional<Engagement> authorEngagement(long postId, long authorId) {
        return query(postId, authorId);
    }

    private Optional<Engagement> query(long postId, Long authorId) {
        return jdbc.query("""
                WITH RECURSIVE readable AS (
                  SELECT id, post_id, status, 0 AS level FROM comments
                  WHERE post_id=? AND parent_id IS NULL AND status IN ('VISIBLE','DELETED')
                  UNION ALL
                  SELECT c.id, c.post_id, c.status, r.level+1
                  FROM comments c JOIN readable r ON c.parent_id=r.id AND c.post_id=r.post_id
                  WHERE c.status IN ('VISIBLE','DELETED') AND r.level<5
                )
                SELECT p.id,p.view_count,p.vote_score,
                  (SELECT count(*) FROM readable WHERE status='VISIBLE') AS comments,
                  (SELECT collected_from FROM analytics_collection_starts WHERE event_type='POST_VIEWED') AS cutoff,
                  (SELECT count(*) FROM votes WHERE post_id=p.id AND vote_type='UP') AS upvotes,
                  (SELECT count(*) FROM votes WHERE post_id=p.id AND vote_type='DOWN') AS downvotes
                FROM posts p WHERE p.id=? AND
                  ((?::bigint IS NULL AND p.status IN ('PUBLISHED','LOCKED'))
                   OR (p.user_id=? AND p.status<>'DELETED'))
                """, (rs, row) -> new Engagement(rs.getLong("id"), rs.getLong("view_count"),
                        rs.getLong("comments"), rs.getInt("vote_score"),
                        rs.getObject("cutoff", OffsetDateTime.class), rs.getLong("upvotes"),
                        rs.getLong("downvotes")), postId, postId, authorId, authorId).stream().findFirst();
    }
}
