package com.devpulse.analytics.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Aggregate queries for analytics, written in SQL because they count across
 * several tables at once.
 *
 * <p>Posts count when they are public ({@code PUBLISHED} or {@code LOCKED}) and
 * comments when they are {@code VISIBLE}, the same rules the forum uses.
 * A post's total views are {@code posts.view_count}, the figure the forum shows;
 * the {@code POST_VIEWED} rows of {@code activity_events} are the individual
 * openings behind it, used for time windows and signed-in readers (V10).
 */
@Repository
@RequiredArgsConstructor
public class AnalyticsRepository {

    /** {@code event_type} of a recorded post opening. */
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

    /** Public posts and visible comments on them created on one UTC day. */
    public record PublicDay(LocalDate date, long posts, long comments) {
    }

    /**
     * Public posts of one category created in a window; {@code categoryId},
     * {@code slug} and {@code name} are null for the posts without a category.
     */
    public record CategoryPosts(Long categoryId, String slug, String name, boolean visible, long posts) {
    }

    /** Public posts and visible comments on them created in a window. */
    public record PublicTotals(long posts, long comments) {
    }

    /** The instant at which {@code day} starts in UTC. */
    public static OffsetDateTime startOfUtcDay(LocalDate day) {
        return day.atStartOfDay().atOffset(ZoneOffset.UTC);
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
                SELECT p.title, p.vote_score, p.view_count AS views,
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
                POST_VIEWED, postId).stream().findFirst();
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
     * One row per UTC day from {@code firstDay} to {@code lastDay}, both
     * included, oldest first; days without records count 0. Counts the posts
     * that are public now and the visible comments on them, by creation time.
     */
    public List<PublicDay> publicDailyActivity(LocalDate firstDay, LocalDate lastDay) {
        Timestamp start = Timestamp.from(startOfUtcDay(firstDay).toInstant());
        Timestamp end = Timestamp.from(startOfUtcDay(lastDay.plusDays(1)).toInstant());
        return jdbc.query("""
                WITH post_days AS (
                  SELECT (created_at AT TIME ZONE 'UTC')::date AS day, count(*) AS n
                  FROM posts
                  WHERE %1$s AND created_at >= ? AND created_at < ?
                  GROUP BY 1
                ), comment_days AS (
                  SELECT (c.created_at AT TIME ZONE 'UTC')::date AS day, count(*) AS n
                  FROM comments c
                  JOIN posts p ON p.id = c.post_id
                  WHERE c.status = 'VISIBLE' AND p.%1$s AND c.created_at >= ? AND c.created_at < ?
                  GROUP BY 1
                )
                SELECT d.day::date AS day, coalesce(p.n, 0) AS posts, coalesce(c.n, 0) AS comments
                FROM generate_series(?::date, ?::date, interval '1 day') AS d(day)
                LEFT JOIN post_days p ON p.day = d.day::date
                LEFT JOIN comment_days c ON c.day = d.day::date
                ORDER BY d.day
                """.formatted(PUBLIC_POST),
                (rs, row) -> new PublicDay(rs.getObject("day", LocalDate.class),
                        rs.getLong("posts"), rs.getLong("comments")),
                start, end, start, end, Date.valueOf(firstDay), Date.valueOf(lastDay));
    }

    /**
     * Public posts and the visible comments on them created in each of two
     * adjacent windows, {@code [previousStart, start)} and {@code [start, end)},
     * read in one statement so both see the same data.
     *
     * @return the previous window's totals, then the current one's
     */
    public List<PublicTotals> publicTotals(OffsetDateTime previousStart, OffsetDateTime start, OffsetDateTime end) {
        Timestamp from = Timestamp.from(previousStart.toInstant());
        Timestamp middle = Timestamp.from(start.toInstant());
        Timestamp to = Timestamp.from(end.toInstant());
        return jdbc.queryForObject("""
                SELECT
                  (SELECT count(*) FROM posts
                   WHERE %1$s AND created_at >= ? AND created_at < ?) AS previous_posts,
                  (SELECT count(*) FROM comments c JOIN posts p ON p.id = c.post_id
                   WHERE c.status = 'VISIBLE' AND p.%1$s AND c.created_at >= ? AND c.created_at < ?) AS previous_comments,
                  (SELECT count(*) FROM posts
                   WHERE %1$s AND created_at >= ? AND created_at < ?) AS current_posts,
                  (SELECT count(*) FROM comments c JOIN posts p ON p.id = c.post_id
                   WHERE c.status = 'VISIBLE' AND p.%1$s AND c.created_at >= ? AND c.created_at < ?) AS current_comments
                """.formatted(PUBLIC_POST),
                (rs, row) -> List.of(
                        new PublicTotals(rs.getLong("previous_posts"), rs.getLong("previous_comments")),
                        new PublicTotals(rs.getLong("current_posts"), rs.getLong("current_comments"))),
                from, middle, from, middle, middle, to, middle, to);
    }

    /**
     * Public posts created from the start of {@code firstDay} to the end of
     * {@code lastDay} (UTC) by category: every visible category in display
     * order, then by name, with 0 when it has none; a hidden category only
     * when it has some; and last, always, the posts without a category.
     */
    public List<CategoryPosts> publicPostsByCategory(LocalDate firstDay, LocalDate lastDay) {
        Timestamp start = Timestamp.from(startOfUtcDay(firstDay).toInstant());
        Timestamp end = Timestamp.from(startOfUtcDay(lastDay.plusDays(1)).toInstant());
        return jdbc.query("""
                WITH counted AS (
                  SELECT category_id, count(*) AS n
                  FROM posts
                  WHERE %s AND created_at >= ? AND created_at < ?
                  GROUP BY category_id
                )
                SELECT id, slug, name, visible, posts FROM (
                  SELECT c.id, c.slug, c.name, c.is_visible AS visible, coalesce(n.n, 0) AS posts,
                         0 AS grp, c.display_order AS ord
                  FROM categories c
                  LEFT JOIN counted n ON n.category_id = c.id
                  WHERE c.is_visible OR n.n > 0
                  UNION ALL
                  SELECT NULL::bigint, NULL::varchar, NULL::varchar, true,
                         coalesce((SELECT n FROM counted WHERE category_id IS NULL), 0), 1, 0
                ) AS rows
                ORDER BY grp, ord, name
                """.formatted(PUBLIC_POST),
                (rs, row) -> new CategoryPosts(rs.getObject("id", Long.class), rs.getString("slug"),
                        rs.getString("name"), rs.getBoolean("visible"), rs.getLong("posts")),
                start, end);
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

    /**
     * Records an opening of a post by the user with {@code username}, or by a
     * guest when it is {@code null}, and adds it to {@code posts.view_count},
     * in one statement. An {@code openingId} already recorded changes nothing,
     * also when delivered concurrently.
     */
    public void recordPostOpening(long postId, String username, UUID openingId) {
        jdbc.update("""
                WITH opening AS (
                  INSERT INTO activity_events (user_id, event_type, entity_type, entity_id, opening_id)
                  VALUES ((SELECT id FROM users WHERE username = ?), ?, 'POST', ?, ?)
                  ON CONFLICT (opening_id) WHERE opening_id IS NOT NULL DO NOTHING
                  RETURNING entity_id
                )
                UPDATE posts SET view_count = view_count + 1 WHERE id IN (SELECT entity_id FROM opening)
                """, username, POST_VIEWED, postId, openingId);
    }
}
