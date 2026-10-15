package com.devpulse;

import com.devpulse.support.MigratedSchemaTest;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Migration V7 on a database that already holds rows: {@code updated_at}
 * starts equal to {@code created_at}, and a tag's {@code created_at} becomes
 * the first time it was attached to a post.
 *
 * <p>Uses its own schema, migrated to V6, filled, then migrated to the latest
 * version.
 */
@MigratedSchemaTest
class AuditTimestampsMigrationTest {

    private static final String SCHEMA = "audit_migration_test";
    private static final OffsetDateTime CREATED = OffsetDateTime.parse("2026-01-02T10:00:00Z");
    private static final OffsetDateTime ATTACHED = OffsetDateTime.parse("2026-01-03T10:00:00Z");

    @Autowired
    private DataSource dataSource;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    @AfterEach
    void dropSchema() {
        jdbc.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }

    @Test
    void existingRowsGetTimestampsFromTheirHistory() {
        flyway("6").migrate();
        Long userId = insert("INSERT INTO %s.users (username, email, password_hash, created_at) "
                + "VALUES ('audit', 'audit@example.com', 'hash', ?) RETURNING id", CREATED);
        Long postId = insert("INSERT INTO %s.posts (user_id, title, slug, content) "
                + "VALUES (?, 'Post', 'audit-post', 'Body') RETURNING id", userId);
        Long usedTag = insert("INSERT INTO %s.tags (name, slug) VALUES ('used', 'used') RETURNING id");
        Long unusedTag = insert("INSERT INTO %s.tags (name, slug) VALUES ('unused', 'unused') RETURNING id");
        jdbc.update(qualified("INSERT INTO %s.post_tags (post_id, tag_id, created_at) VALUES (?, ?, ?)"),
                postId, usedTag, ATTACHED);
        jdbc.update(qualified("INSERT INTO %s.refresh_tokens (user_id, token, expires_at, created_at) "
                + "VALUES (?, ?, ?, ?)"), userId, "b".repeat(64), CREATED.plusDays(7), CREATED);

        flyway("latest").migrate();

        assertThat(timestamps("tags WHERE id = " + usedTag))
                .containsExactly(Map.entry("created_at", ATTACHED), Map.entry("updated_at", ATTACHED));
        assertThat(timestamps("tags WHERE id = " + unusedTag).values()).doesNotContainNull().hasSize(2)
                .allSatisfy(value -> assertThat(value).isAfter(ATTACHED));
        assertThat(timestamps("refresh_tokens WHERE user_id = " + userId))
                .containsExactly(Map.entry("created_at", CREATED), Map.entry("updated_at", CREATED));
        assertThat(jdbc.queryForObject(qualified(
                "SELECT count(*) FROM %s.categories WHERE updated_at IS DISTINCT FROM created_at"), Long.class))
                .isZero();
    }

    private Flyway flyway(String target) {
        return Flyway.configure()
                .dataSource(dataSource)
                .schemas(SCHEMA)
                .defaultSchema(SCHEMA)
                .target(target)
                .load();
    }

    private Long insert(String sql, Object... args) {
        return jdbc.queryForObject(qualified(sql), Long.class, args);
    }

    /** The audit columns of the single row selected by {@code tableAndCondition}, in UTC. */
    private Map<String, OffsetDateTime> timestamps(String tableAndCondition) {
        Map<String, Object> row = jdbc.queryForMap(
                qualified("SELECT created_at, updated_at FROM %s." + tableAndCondition));
        Map<String, OffsetDateTime> timestamps = new LinkedHashMap<>();
        row.forEach((column, value) -> timestamps.put(column, utc(value)));
        return timestamps;
    }

    private static OffsetDateTime utc(Object value) {
        OffsetDateTime time = value instanceof Timestamp timestamp
                ? timestamp.toInstant().atOffset(ZoneOffset.UTC)
                : (OffsetDateTime) value;
        return time.withOffsetSameInstant(ZoneOffset.UTC);
    }

    private static String qualified(String sql) {
        return sql.formatted(SCHEMA);
    }
}
