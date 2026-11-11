package com.devpulse.analytics.repository;

import com.devpulse.analytics.repository.AnalyticsRepository.PublicDay;
import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * UTC day edges of the public activity on the migrated schema, in a past
 * window no other test writes to, so the dates are fixed.
 */
@MigratedSchemaTest
@Transactional
class AnalyticsRepositoryPublicActivityTest {

    private static final LocalDate FIRST_DAY = LocalDate.of(2020, 2, 28);
    private static final LocalDate LEAP_DAY = LocalDate.of(2020, 2, 29);
    private static final LocalDate LAST_DAY = LocalDate.of(2020, 3, 1);

    @Autowired private AnalyticsRepository repository;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private long author;

    @BeforeEach
    void setUp() {
        author = jdbc.queryForObject(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, 'hash') RETURNING id",
                Long.class, "activity-" + run, "activity-" + run + "@example.com");
    }

    @Test
    void anEmptyWindowGivesAZeroRowForEveryDay() {
        assertThat(repository.publicDailyActivity(FIRST_DAY, LAST_DAY)).containsExactly(
                new PublicDay(FIRST_DAY, 0, 0),
                new PublicDay(LEAP_DAY, 0, 0),
                new PublicDay(LAST_DAY, 0, 0));
    }

    @Test
    void theStartOfTheFirstDayCountsAndTheStartOfTheNextWindowDoesNot() {
        post("2020-02-27T23:59:59.999999Z");
        post("2020-02-28T00:00:00Z");
        post("2020-03-01T23:59:59.999999Z");
        post("2020-03-02T00:00:00Z");

        assertThat(repository.publicDailyActivity(FIRST_DAY, LAST_DAY)).containsExactly(
                new PublicDay(FIRST_DAY, 1, 0),
                new PublicDay(LEAP_DAY, 0, 0),
                new PublicDay(LAST_DAY, 1, 0));
    }

    @Test
    void recordsBelongToTheirUtcDayWhateverOffsetTheyWereWrittenIn() {
        post("2020-02-29T00:30:00+02:00");
        long post = post("2020-02-29T23:30:00-02:00");
        comment(post, "2020-02-28T23:59:59Z");
        comment(post, "2020-02-29T00:00:00Z");

        assertThat(repository.publicDailyActivity(FIRST_DAY, LAST_DAY)).containsExactly(
                new PublicDay(FIRST_DAY, 1, 1),
                new PublicDay(LEAP_DAY, 0, 1),
                new PublicDay(LAST_DAY, 1, 0));
    }

    private long post(String createdAt) {
        return jdbc.queryForObject("""
                INSERT INTO posts (user_id, title, slug, content, created_at)
                VALUES (?, 'Title', ?, 'Body', ?) RETURNING id
                """, Long.class, author, "activity-" + UUID.randomUUID(), OffsetDateTime.parse(createdAt));
    }

    private void comment(long post, String createdAt) {
        jdbc.update("INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, 'Comment', ?)",
                post, author, OffsetDateTime.parse(createdAt));
    }
}
