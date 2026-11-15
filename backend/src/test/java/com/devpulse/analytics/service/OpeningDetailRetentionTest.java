package com.devpulse.analytics.service;

import com.devpulse.analytics.repository.AnalyticsRepository;
import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

/**
 * The retention of opening details against the real schema, with a fixed
 * clock in 2001 so that no other test's rows are old enough to be touched.
 * Not transactional: the cleanup commits batch by batch, and a second
 * connection must see the rows.
 */
@MigratedSchemaTest
class OpeningDetailRetentionTest {

    private static final Instant NOW = Instant.parse("2001-02-01T00:00:00Z");
    private static final OffsetDateTime CUTOFF = OffsetDateTime.parse("2001-01-02T00:00:00Z");
    private static final LocalDate FIRST_DAY = LocalDate.of(2000, 11, 1);
    private static final LocalDate LAST_DAY = LocalDate.of(2001, 1, 31);

    @Autowired private AnalyticsRepository analytics;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private long alice;
    private long bob;
    private long post;
    private long old;
    private long guest;
    private long justBefore;
    private long atCutoff;
    private long recent;
    private long legacy;
    private long otherType;

    @BeforeEach
    void setUp() {
        alice = user("alice");
        bob = user("bob");
        post = jdbc.queryForObject("""
                INSERT INTO posts (user_id, title, slug, content, status, view_count)
                VALUES (?, 'Kept', ?, 'Body', 'PUBLISHED', 5) RETURNING id
                """, Long.class, alice, "kept-" + run);
        old = opening(alice, "2000-12-20T10:00:00Z");
        guest = opening(null, "2000-12-21T10:00:00Z");
        justBefore = opening(bob, "2001-01-01T23:59:59.999999Z");
        atCutoff = opening(alice, "2001-01-02T00:00:00Z");
        recent = opening(bob, "2001-01-20T10:00:00Z");
        legacy = event(alice, "POST_READ_LEGACY", "2000-11-01T10:00:00Z", null);
        otherType = event(alice, "POST_CREATED", "2000-11-01T10:00:00Z", null);
    }

    @AfterEach
    void tearDown() {
        jdbc.update("DELETE FROM activity_events WHERE entity_type = 'POST' AND entity_id = ?", post);
        jdbc.update("DELETE FROM posts WHERE id = ?", post);
        jdbc.update("DELETE FROM users WHERE id IN (?, ?)", alice, bob);
    }

    @Test
    void crossingTheCutoffClearsOnlyOldReadersAndKeepsEveryCount() {
        Map<LocalDate, Long> daily = analytics.dailyPostOpenings(post, FIRST_DAY, LAST_DAY);
        long views = viewCount();

        assertThat(retention(NOW, 2).cutoff()).isEqualTo(CUTOFF);
        assertThat(retention(NOW.plusNanos(1_234_567), 2).cutoff()).isEqualTo(CUTOFF.plusNanos(1_000_000));
        assertThat(retention(NOW, 2).clearExpiredDetails()).isEqualTo(3);

        assertThat(reader(old)).isNull();
        assertThat(reader(guest)).isNull();
        assertThat(reader(justBefore)).isNull();
        assertThat(reader(atCutoff)).isEqualTo(alice);
        assertThat(reader(recent)).isEqualTo(bob);
        assertThat(jdbc.queryForMap("SELECT user_id, ip_address, metadata FROM activity_events WHERE id = ?", legacy))
                .containsEntry("user_id", null).containsEntry("ip_address", null).containsEntry("metadata", null);
        assertThat(reader(otherType)).isEqualTo(alice);
        assertThat(jdbc.queryForObject("SELECT opening_id FROM activity_events WHERE id = ?", UUID.class, old))
                .isNotNull();

        assertThat(analytics.dailyPostOpenings(post, FIRST_DAY, LAST_DAY)).isEqualTo(daily);
        assertThat(rows()).isEqualTo(7);
        assertThat(viewCount()).isEqualTo(views);
        assertThat(analytics.postEngagement(post, CUTOFF)).get()
                .satisfies(engagement -> assertThat(engagement.uniqueViewers()).isEqualTo(2));

        assertThat(retention(NOW, 2).clearExpiredDetails()).isZero();
        assertThat(reader(atCutoff)).isEqualTo(alice);

        Instant later = NOW.plus(Duration.ofDays(19));
        assertThat(retention(later, 2).clearExpiredDetails()).isEqualTo(2);
        assertThat(reader(atCutoff)).isNull();
        assertThat(reader(recent)).isNull();
        assertThat(analytics.dailyPostOpenings(post, FIRST_DAY, LAST_DAY)).isEqualTo(daily);
        assertThat(viewCount()).isEqualTo(views);
    }

    @Test
    void anOpeningRetriedAfterItsReaderWasClearedStillCountsOnce() {
        UUID openingId = jdbc.queryForObject("SELECT opening_id FROM activity_events WHERE id = ?", UUID.class, old);
        retention(NOW, 1000).clearExpiredDetails();
        long views = viewCount();

        analytics.recordPostOpening(post, "alice-" + run, openingId);

        assertThat(viewCount()).isEqualTo(views);
        assertThat(rows()).isEqualTo(7);
        assertThat(reader(old)).isNull();
    }

    @Test
    void aRunStoppedAfterOneBatchAndRetriedEndsAsOneFullRun() {
        Map<LocalDate, Long> daily = analytics.dailyPostOpenings(post, FIRST_DAY, LAST_DAY);

        assertThat(analytics.anonymizeOpeningDetails(CUTOFF, 1)).isEqualTo(1);
        assertThat(reader(legacy)).isNull();
        assertThat(reader(old)).isEqualTo(alice);
        assertThat(analytics.dailyPostOpenings(post, FIRST_DAY, LAST_DAY)).isEqualTo(daily);

        assertThat(retention(NOW, 1).clearExpiredDetails()).isEqualTo(2);
        assertThat(retention(NOW, 1).clearExpiredDetails()).isZero();
        assertThat(Arrays.asList(reader(old), reader(justBefore))).containsOnlyNulls();
        assertThat(reader(atCutoff)).isEqualTo(alice);
        assertThat(analytics.dailyPostOpenings(post, FIRST_DAY, LAST_DAY)).isEqualTo(daily);
        assertThat(rows()).isEqualTo(7);
    }

    @Test
    void aRowHeldByAnotherTransactionIsSkippedNotWaitedForAndClearedLater() throws Exception {
        try (Connection writer = dataSource.getConnection()) {
            writer.setAutoCommit(false);
            try (PreparedStatement lock = writer.prepareStatement(
                    "SELECT id FROM activity_events WHERE id = ? FOR UPDATE")) {
                lock.setLong(1, old);
                lock.executeQuery().close();
            }

            long cleared = assertTimeoutPreemptively(Duration.ofSeconds(20),
                    () -> retention(NOW, 1).clearExpiredDetails());

            assertThat(cleared).isEqualTo(2);
            assertThat(reader(old)).isEqualTo(alice);
            writer.rollback();
        }

        assertThat(retention(NOW, 1).clearExpiredDetails()).isEqualTo(1);
        assertThat(reader(old)).isNull();
    }

    @Test
    void theRetentionAndBatchSizeMustBePositive() {
        Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
        assertThatThrownBy(() -> new OpeningDetailRetention(analytics, clock, Duration.ZERO, 10))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new OpeningDetailRetention(analytics, clock, Duration.ofDays(-1), 10))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new OpeningDetailRetention(analytics, clock, Duration.ofDays(30), 0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private OpeningDetailRetention retention(Instant now, int batchSize) {
        return new OpeningDetailRetention(analytics, Clock.fixed(now, ZoneOffset.UTC), Duration.ofDays(30), batchSize);
    }

    private Long reader(long event) {
        return jdbc.queryForObject("SELECT user_id FROM activity_events WHERE id = ?", Long.class, event);
    }

    private long rows() {
        return jdbc.queryForObject("SELECT count(*) FROM activity_events WHERE entity_type = 'POST' AND entity_id = ?",
                Long.class, post);
    }

    private long viewCount() {
        return jdbc.queryForObject("SELECT view_count FROM posts WHERE id = ?", Long.class, post);
    }

    private long opening(Long reader, String createdAt) {
        return event(reader, AnalyticsRepository.POST_VIEWED, createdAt, UUID.randomUUID());
    }

    private long event(Long reader, String type, String createdAt, UUID openingId) {
        boolean legacyRead = type.equals("POST_READ_LEGACY");
        return jdbc.queryForObject("""
                INSERT INTO activity_events (user_id, event_type, entity_type, entity_id, opening_id,
                                             ip_address, metadata, created_at)
                VALUES (?, ?, 'POST', ?, ?, CAST(? AS inet), CAST(? AS jsonb), ?) RETURNING id
                """, Long.class, reader, type, post, openingId,
                legacyRead ? "192.0.2.10" : null, legacyRead ? "{\"referrer\": \"https://example.test/\"}" : null,
                OffsetDateTime.parse(createdAt));
    }

    private long user(String name) {
        return jdbc.queryForObject(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, 'hash') RETURNING id",
                Long.class, name + "-" + run, name + "-" + run + "@example.com");
    }
}
