package com.devpulse.analytics.repository;

import com.devpulse.analytics.repository.AnalyticsRepository.PublicTotals;
import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Two adjacent public windows on the migrated schema, in the past where no
 * other test writes, so the instants are fixed: the previous window is
 * {@code [2020-02-17T09:30Z, 2020-02-24T00:00Z)} and the current one
 * {@code [2020-02-24T00:00Z, 2020-03-01T14:30Z)}, both 6 days 14.5 hours long.
 */
@MigratedSchemaTest
@Transactional
class AnalyticsRepositoryComparisonTest {

    private static final OffsetDateTime PREVIOUS_START = OffsetDateTime.parse("2020-02-17T09:30:00Z");
    private static final OffsetDateTime START = OffsetDateTime.parse("2020-02-24T00:00:00Z");
    private static final OffsetDateTime END = OffsetDateTime.parse("2020-03-01T14:30:00Z");

    @Autowired private AnalyticsRepository repository;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private long author;

    @BeforeEach
    void setUp() {
        author = jdbc.queryForObject(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, 'hash') RETURNING id",
                Long.class, "compare-" + run, "compare-" + run + "@example.com");
    }

    @Test
    void emptyWindowsAreZero() {
        assertThat(repository.publicTotals(PREVIOUS_START, START, END))
                .containsExactly(new PublicTotals(0, 0), new PublicTotals(0, 0));
    }

    @Test
    void eachRecordBelongsToExactlyOneWindowAndTheSharedBoundaryToTheCurrentOne() {
        post("PUBLISHED", "2020-02-17T09:29:59.999999Z");
        long first = post("PUBLISHED", "2020-02-17T09:30:00Z");
        post("LOCKED", "2020-02-23T23:59:59.999999Z");
        long boundary = post("PUBLISHED", "2020-02-24T00:00:00Z");
        post("PUBLISHED", "2020-03-01T14:29:59.999999Z");
        post("PUBLISHED", "2020-03-01T14:30:00Z");
        comment(first, "VISIBLE", "2020-02-23T23:59:59.999999Z");
        comment(first, "VISIBLE", "2020-02-24T00:00:00Z");
        comment(boundary, "VISIBLE", "2020-03-01T14:30:00Z");

        assertThat(repository.publicTotals(PREVIOUS_START, START, END))
                .containsExactly(new PublicTotals(2, 1), new PublicTotals(2, 1));
    }

    @Test
    void hiddenRecordsCountInNeitherWindow() {
        long visible = post("PUBLISHED", "2020-02-20T12:00:00Z");
        long draft = post("DRAFT", "2020-02-20T12:00:00Z");
        long deleted = post("DELETED", "2020-02-26T12:00:00Z");
        comment(visible, "HIDDEN", "2020-02-21T12:00:00Z");
        comment(visible, "DELETED", "2020-02-26T12:00:00Z");
        comment(draft, "VISIBLE", "2020-02-21T12:00:00Z");
        comment(deleted, "VISIBLE", "2020-02-26T12:00:00Z");
        comment(visible, "VISIBLE", "2020-02-26T12:00:00Z");

        assertThat(repository.publicTotals(PREVIOUS_START, START, END))
                .containsExactly(new PublicTotals(1, 0), new PublicTotals(0, 1));
    }

    private long post(String status, String createdAt) {
        return jdbc.queryForObject("""
                INSERT INTO posts (user_id, title, slug, content, status, created_at)
                VALUES (?, 'Title', ?, 'Body', CAST(? AS post_status), ?) RETURNING id
                """, Long.class, author, "compare-" + UUID.randomUUID(), status, OffsetDateTime.parse(createdAt));
    }

    private void comment(long post, String status, String createdAt) {
        jdbc.update("""
                INSERT INTO comments (post_id, user_id, content, status, created_at)
                VALUES (?, ?, 'Comment', CAST(? AS comment_status), ?)
                """, post, author, status, OffsetDateTime.parse(createdAt));
    }
}
