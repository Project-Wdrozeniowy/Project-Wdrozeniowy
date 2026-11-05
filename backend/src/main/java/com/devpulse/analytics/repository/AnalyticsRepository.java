package com.devpulse.analytics.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Aggregate queries for analytics, written in SQL because they count across
 * several tables at once.
 *
 * <p>Posts count when they are public ({@code PUBLISHED} or {@code LOCKED}) and
 * comments when they are {@code VISIBLE}, the same rules the forum uses.
 * Post views are the {@code POST_VIEWED} rows of {@code activity_events} (V4).
 */
@Repository
@RequiredArgsConstructor
public class AnalyticsRepository {

    /** {@code event_type} of a recorded post view. */
    public static final String POST_VIEWED = "POST_VIEWED";

    private static final String PUBLIC_POST = "status IN ('PUBLISHED', 'LOCKED')";

    /** Table whose {@code created_at} each trend metric counts. */
    private static final Map<String, String> TREND_TABLES = Map.of(
            "posts", "posts",
            "comments", "comments",
            "votes", "votes",
            "users", "users");

    private final JdbcTemplate jdbc;

    /** Counters of one user's own activity and of the votes their posts and comments received. */
    public record UserActivity(long posts, long comments, long votesCast,
                               long upvotesReceived, long downvotesReceived, OffsetDateTime lastActivityAt) {
    }

    /** Engagement of one post. */
    public record PostEngagement(String title, long views, long uniqueViewers, long comments,
                                 int voteScore, long upvotes, long downvotes, long subscriptions) {
    }

    /** Platform-wide totals. */
    public record PlatformTotals(long users, long activeUsers, long posts, long comments,
                                 long votes, long categories, long tags) {
    }

    public UserActivity userActivity(long userId) {
        return jdbc.queryForObject("""
                SELECT
                  (SELECT count(*) FROM posts WHERE user_id = ? AND %1$s) AS posts,
                  (SELECT count(*) FROM comments WHERE user_id = ? AND status = 'VISIBLE') AS comments,
                  (SELECT count(*) FROM votes WHERE user_id = ?) AS votes_cast,
                  (SELECT count(*) FROM votes v
                     LEFT JOIN posts p ON p.id = v.post_id
                     LEFT JOIN comments c ON c.id = v.comment_id
                   WHERE (p.user_id = ? OR c.user_id = ?) AND v.vote_type = 'UP') AS upvotes,
                  (SELECT count(*) FROM votes v
                     LEFT JOIN posts p ON p.id = v.post_id
                     LEFT JOIN comments c ON c.id = v.comment_id
                   WHERE (p.user_id = ? OR c.user_id = ?) AND v.vote_type = 'DOWN') AS downvotes,
                  GREATEST((SELECT max(created_at) FROM posts WHERE user_id = ?),
                           (SELECT max(created_at) FROM comments WHERE user_id = ?),
                           (SELECT max(updated_at) FROM votes WHERE user_id = ?)) AS last_activity
                """.formatted(PUBLIC_POST),
                (rs, row) -> new UserActivity(rs.getLong("posts"), rs.getLong("comments"), rs.getLong("votes_cast"),
                        rs.getLong("upvotes"), rs.getLong("downvotes"),
                        rs.getObject("last_activity", OffsetDateTime.class)),
                userId, userId, userId, userId, userId, userId, userId, userId, userId, userId);
    }

    /** Engagement of the post, or empty if it does not exist. */
    public Optional<PostEngagement> postEngagement(long postId) {
        return jdbc.query("""
                SELECT p.title, p.vote_score,
                  (SELECT count(*) FROM activity_events
                   WHERE event_type = ? AND entity_type = 'POST' AND entity_id = p.id) AS views,
                  (SELECT count(DISTINCT user_id) FROM activity_events
                   WHERE event_type = ? AND entity_type = 'POST' AND entity_id = p.id) AS unique_viewers,
                  (SELECT count(*) FROM comments WHERE post_id = p.id AND status = 'VISIBLE') AS comments,
                  (SELECT count(*) FROM votes WHERE post_id = p.id AND vote_type = 'UP') AS upvotes,
                  (SELECT count(*) FROM votes WHERE post_id = p.id AND vote_type = 'DOWN') AS downvotes,
                  (SELECT count(*) FROM post_subscriptions WHERE post_id = p.id) AS subscriptions
                FROM posts p WHERE p.id = ?
                """, (rs, row) -> new PostEngagement(rs.getString("title"), rs.getLong("views"),
                        rs.getLong("unique_viewers"), rs.getLong("comments"), rs.getInt("vote_score"),
                        rs.getLong("upvotes"), rs.getLong("downvotes"), rs.getLong("subscriptions")),
                POST_VIEWED, POST_VIEWED, postId).stream().findFirst();
    }

    public PlatformTotals platformTotals() {
        return jdbc.queryForObject("""
                SELECT
                  (SELECT count(*) FROM users) AS users,
                  (SELECT count(*) FROM users WHERE status = 'ACTIVE') AS active_users,
                  (SELECT count(*) FROM posts WHERE %1$s) AS posts,
                  (SELECT count(*) FROM comments WHERE status = 'VISIBLE') AS comments,
                  (SELECT count(*) FROM votes) AS votes,
                  (SELECT count(*) FROM categories) AS categories,
                  (SELECT count(*) FROM tags) AS tags
                """.formatted(PUBLIC_POST),
                (rs, row) -> new PlatformTotals(rs.getLong("users"), rs.getLong("active_users"), rs.getLong("posts"),
                        rs.getLong("comments"), rs.getLong("votes"), rs.getLong("categories"), rs.getLong("tags")));
    }

    /**
     * Rows of {@code metric} created since {@code from}, per UTC day from the
     * day of {@code from} to the day of {@code to}; days without rows count 0.
     *
     * @param metric one of {@code posts}, {@code comments}, {@code votes}, {@code users}
     */
    public Map<LocalDate, Long> dailyCounts(String metric, OffsetDateTime from, OffsetDateTime to) {
        String table = TREND_TABLES.get(metric);
        if (table == null) {
            throw new IllegalArgumentException("Unknown metric " + metric);
        }
        Map<LocalDate, Long> counts = new LinkedHashMap<>();
        jdbc.query("""
                SELECT day::date AS day, count(t.created_at) AS n
                FROM generate_series((?::timestamptz AT TIME ZONE 'UTC')::date,
                                     (?::timestamptz AT TIME ZONE 'UTC')::date,
                                     interval '1 day') AS day
                LEFT JOIN %s t ON (t.created_at AT TIME ZONE 'UTC')::date = day::date AND t.created_at >= ?
                GROUP BY day ORDER BY day
                """.formatted(table),
                rs -> {
                    counts.put(rs.getObject("day", LocalDate.class), rs.getLong("n"));
                },
                Timestamp.from(from.toInstant()), Timestamp.from(to.toInstant()), Timestamp.from(from.toInstant()));
        return counts;
    }

    /**
     * Ids of public posts with activity since {@code from}, most active first.
     * Activity is views + 2 × votes cast + 3 × visible comments within the
     * window; ties go to the higher vote score, then the more recent activity,
     * then the higher id. Posts without activity in the window are left out.
     */
    public List<Long> trendingPostIds(OffsetDateTime from, int limit) {
        Timestamp since = Timestamp.from(from.toInstant());
        return jdbc.queryForList("""
                SELECT p.id FROM posts p
                LEFT JOIN (SELECT entity_id AS post_id, count(*) AS n FROM activity_events
                           WHERE event_type = ? AND entity_type = 'POST' AND created_at >= ?
                           GROUP BY entity_id) v ON v.post_id = p.id
                LEFT JOIN (SELECT post_id, count(*) AS n FROM votes
                           WHERE post_id IS NOT NULL AND created_at >= ? GROUP BY post_id) vt ON vt.post_id = p.id
                LEFT JOIN (SELECT post_id, count(*) AS n FROM comments
                           WHERE status = 'VISIBLE' AND created_at >= ? GROUP BY post_id) c ON c.post_id = p.id
                WHERE p.%s
                  AND coalesce(v.n, 0) + coalesce(vt.n, 0) + coalesce(c.n, 0) > 0
                ORDER BY coalesce(v.n, 0) + 2 * coalesce(vt.n, 0) + 3 * coalesce(c.n, 0) DESC,
                         p.vote_score DESC, p.last_activity_at DESC, p.id DESC
                LIMIT ?
                """.formatted(PUBLIC_POST), Long.class, POST_VIEWED, since, since, since, limit);
    }

    /** Records that a post was read, by the user with {@code username} or anonymously when it is {@code null}. */
    public void recordPostView(long postId, String username) {
        jdbc.update("""
                INSERT INTO activity_events (user_id, event_type, entity_type, entity_id)
                VALUES ((SELECT id FROM users WHERE username = ?), ?, 'POST', ?)
                """, username, POST_VIEWED, postId);
    }
}
