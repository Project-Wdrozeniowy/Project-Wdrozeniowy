package com.devpulse.analytics.repository;

import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.entry;

/**
 * Daily openings of one post on the migrated schema, in a past window no
 * other test writes to, so the dates are fixed.
 */
@MigratedSchemaTest
@Transactional
class AnalyticsRepositoryPostOpeningsTest {

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
                Long.class, "opened-" + run, "opened-" + run + "@example.com");
    }

    @Test
    void aPostWithoutOpeningsGetsAZeroForEveryDay() {
        long post = post();

        assertThat(repository.dailyPostOpenings(post, FIRST_DAY, LAST_DAY))
                .containsExactly(entry(FIRST_DAY, 0L), entry(LEAP_DAY, 0L), entry(LAST_DAY, 0L));
    }

    @Test
    void openingsBelongToTheirUtcDayAndOnlyThisPostsOpeningsCount() {
        long post = post();
        long other = post();
        opening(post, "POST_VIEWED", "2020-02-27T23:59:59.999999Z");
        opening(post, "POST_VIEWED", "2020-02-28T00:00:00Z");
        opening(post, "POST_VIEWED", "2020-02-29T00:30:00+02:00");
        opening(post, "POST_VIEWED", "2020-02-29T23:30:00-02:00");
        opening(post, "POST_VIEWED", "2020-03-01T23:59:59.999999Z");
        opening(post, "POST_VIEWED", "2020-03-02T00:00:00Z");
        opening(post, "POST_READ_LEGACY", "2020-02-29T12:00:00Z");
        opening(other, "POST_VIEWED", "2020-02-29T12:00:00Z");

        Map<LocalDate, Long> days = repository.dailyPostOpenings(post, FIRST_DAY, LAST_DAY);

        assertThat(days).containsExactly(entry(FIRST_DAY, 2L), entry(LEAP_DAY, 0L), entry(LAST_DAY, 2L));
        assertThat(repository.dailyPostOpenings(other, FIRST_DAY, LAST_DAY)).containsEntry(LEAP_DAY, 1L);
    }

    @Test
    void theCollectionStartIsRecordedForOpenings() {
        OffsetDateTime start = OffsetDateTime.parse("2020-02-29T10:15:00Z");
        jdbc.update("UPDATE analytics_collection_starts SET collected_from = ? WHERE event_type = 'POST_VIEWED'",
                start);

        assertThat(repository.collectedFrom(AnalyticsRepository.POST_VIEWED)).isEqualTo(start);
    }

    private long post() {
        return jdbc.queryForObject("""
                INSERT INTO posts (user_id, title, slug, content) VALUES (?, 'Title', ?, 'Body') RETURNING id
                """, Long.class, author, "opened-" + UUID.randomUUID());
    }

    private void opening(long post, String eventType, String createdAt) {
        jdbc.update("""
                INSERT INTO activity_events (event_type, entity_type, entity_id, opening_id, created_at)
                VALUES (?, 'POST', ?, ?, ?)
                """, eventType, post, UUID.randomUUID(), OffsetDateTime.parse(createdAt));
    }
}
