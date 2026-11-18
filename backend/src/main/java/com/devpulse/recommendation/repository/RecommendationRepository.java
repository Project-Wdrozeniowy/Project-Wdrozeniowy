package com.devpulse.recommendation.repository;

import com.devpulse.analytics.repository.AnalyticsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.sql.Types;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Ranking queries of the recommendations, written in SQL because they score
 * posts and tags across several tables at once.
 *
 * <p>Only public posts ({@code PUBLISHED} or {@code LOCKED}) and visible
 * comments count, the same rules the forum and the analytics use.
 *
 * <p>The caller's <em>interest posts</em> are the public posts they wrote,
 * upvoted or commented on. Their tags are the caller's interest tags and
 * their categories the interest categories. An anonymous caller, or one
 * without such activity, has none.
 */
@Repository
@RequiredArgsConstructor
public class RecommendationRepository {

    private static final String PUBLIC = "status IN ('PUBLISHED', 'LOCKED')";

    /** The caller's interest posts, interest tags and interest categories; {@code :me} is a username or null. */
    private static final String INTERESTS = """
            me AS (SELECT id FROM users WHERE username = :me),
            interest_posts AS (
                SELECT p.id FROM posts p WHERE p.%1$s AND p.user_id IN (SELECT id FROM me)
                UNION
                SELECT p.id FROM posts p JOIN votes v ON v.post_id = p.id
                WHERE p.%1$s AND v.vote_type = 'UP' AND v.user_id IN (SELECT id FROM me)
                UNION
                SELECT p.id FROM posts p JOIN comments c ON c.post_id = p.id
                WHERE p.%1$s AND c.status = 'VISIBLE' AND c.user_id IN (SELECT id FROM me)),
            interest_tags AS (
                SELECT DISTINCT pt.tag_id FROM post_tags pt WHERE pt.post_id IN (SELECT id FROM interest_posts)),
            interest_categories AS (
                SELECT DISTINCT p.category_id FROM posts p
                WHERE p.id IN (SELECT id FROM interest_posts) AND p.category_id IS NOT NULL)
            """.formatted(PUBLIC);

    private final NamedParameterJdbcTemplate jdbc;

    /** One ranked post: its id and the rule that placed it. */
    public record RankedPost(long id, int sharedTags, boolean sameCategory) {
    }

    /**
     * Ranks the public posts for the caller with {@code username}, or for an
     * anonymous caller when it is {@code null}.
     *
     * <p>Posts the caller wrote, voted on or commented on are left out. The
     * rest are ordered by these rules, each breaking the ties of the one
     * before:
     * <ol>
     *   <li>group: posts sharing at least one interest tag, then posts in an
     *       interest category, then all other posts;</li>
     *   <li>number of shared interest tags, most first;</li>
     *   <li>activity since {@code from}: views + 2 × votes + 3 × visible
     *       comments, the trending score of
     *       {@link AnalyticsRepository#trendingPostIds};</li>
     *   <li>vote score, then creation time, newest first, then id, highest
     *       first.</li>
     * </ol>
     */
    public List<RankedPost> rankPosts(String username, OffsetDateTime from, int limit) {
        String sql = """
                WITH %s,
                engaged AS (
                    SELECT p.id AS post_id FROM posts p WHERE p.user_id IN (SELECT id FROM me)
                    UNION SELECT v.post_id FROM votes v WHERE v.post_id IS NOT NULL AND v.user_id IN (SELECT id FROM me)
                    UNION SELECT c.post_id FROM comments c WHERE c.user_id IN (SELECT id FROM me)),
                ranked AS (
                    SELECT p.id, p.vote_score, p.created_at,
                           coalesce(views.n, 0) + 2 * coalesce(recent_votes.n, 0)
                               + 3 * coalesce(recent_comments.n, 0) AS score,
                           (SELECT count(*) FROM post_tags pt
                            WHERE pt.post_id = p.id AND pt.tag_id IN (SELECT tag_id FROM interest_tags)) AS shared_tags,
                           p.category_id IN (SELECT category_id FROM interest_categories) AS same_category
                    FROM posts p
                    LEFT JOIN (SELECT entity_id AS post_id, count(*) AS n FROM activity_events
                               WHERE event_type = :viewed AND entity_type = 'POST' AND created_at >= :since
                               GROUP BY entity_id) views ON views.post_id = p.id
                    LEFT JOIN (SELECT post_id, count(*) AS n FROM votes
                               WHERE post_id IS NOT NULL AND created_at >= :since
                               GROUP BY post_id) recent_votes ON recent_votes.post_id = p.id
                    LEFT JOIN (SELECT post_id, count(*) AS n FROM comments
                               WHERE status = 'VISIBLE' AND created_at >= :since
                               GROUP BY post_id) recent_comments ON recent_comments.post_id = p.id
                    WHERE p.%s AND p.id NOT IN (SELECT post_id FROM engaged))
                SELECT id, shared_tags, coalesce(same_category, false) AS same_category FROM ranked
                ORDER BY CASE WHEN shared_tags > 0 THEN 0 WHEN same_category THEN 1 ELSE 2 END,
                         shared_tags DESC, score DESC, vote_score DESC, created_at DESC, id DESC
                LIMIT :limit
                """.formatted(INTERESTS, PUBLIC);
        return jdbc.query(sql, params(username, from, limit), (rs, i) ->
                new RankedPost(rs.getLong("id"), rs.getInt("shared_tags"), rs.getBoolean("same_category")));
    }

    /**
     * Ranks the tags on at least one public post for the caller with
     * {@code username}, or for an anonymous caller when it is {@code null}.
     *
     * <p>The caller's interest tags are left out. The rest are ordered by:
     * <ol>
     *   <li>related public posts: public posts that carry the tag and at
     *       least one interest tag, most first;</li>
     *   <li>recent public posts: public posts created since {@code from}
     *       that carry the tag, most first;</li>
     *   <li>{@code postCount}, most first, then name.</li>
     * </ol>
     */
    public List<Long> rankTags(String username, OffsetDateTime from, int limit) {
        String sql = """
                WITH %1$s,
                related AS (
                    SELECT pt.tag_id, count(*) AS n FROM post_tags pt JOIN posts p ON p.id = pt.post_id
                    WHERE p.%2$s AND EXISTS (SELECT 1 FROM post_tags it
                        WHERE it.post_id = p.id AND it.tag_id IN (SELECT tag_id FROM interest_tags))
                    GROUP BY pt.tag_id),
                recent AS (
                    SELECT pt.tag_id, count(*) AS n FROM post_tags pt JOIN posts p ON p.id = pt.post_id
                    WHERE p.%2$s AND p.created_at >= :since
                    GROUP BY pt.tag_id)
                SELECT t.id FROM tags t
                LEFT JOIN related r ON r.tag_id = t.id
                LEFT JOIN recent rc ON rc.tag_id = t.id
                WHERE t.post_count > 0 AND t.id NOT IN (SELECT tag_id FROM interest_tags)
                ORDER BY coalesce(r.n, 0) DESC, coalesce(rc.n, 0) DESC, t.post_count DESC, t.name ASC
                LIMIT :limit
                """.formatted(INTERESTS, PUBLIC);
        return jdbc.queryForList(sql, params(username, from, limit), Long.class);
    }

    private static MapSqlParameterSource params(String username, OffsetDateTime from, int limit) {
        return new MapSqlParameterSource()
                .addValue("me", username, Types.VARCHAR)
                .addValue("since", Timestamp.from(from.toInstant()))
                .addValue("viewed", AnalyticsRepository.POST_VIEWED)
                .addValue("limit", limit);
    }
}
