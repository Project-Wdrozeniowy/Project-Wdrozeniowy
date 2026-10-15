package com.devpulse;

import com.devpulse.auth.entity.RefreshToken;
import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.entity.UserStatus;
import com.devpulse.auth.repository.RefreshTokenRepository;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.forum.entity.Category;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.entity.Tag;
import com.devpulse.forum.repository.CategoryRepository;
import com.devpulse.forum.repository.PostRepository;
import com.devpulse.forum.repository.TagRepository;
import com.devpulse.support.MigratedSchemaTest;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Checks that the Flyway migrations run on startup and that every mapped
 * entity can be written to and read back from the schema they produce.
 *
 * <p>Add a round-trip case here whenever a new table or column is mapped,
 * especially a PostgreSQL enum column, which needs
 * {@code @JdbcTypeCode(SqlTypes.NAMED_ENUM)}.
 */
@MigratedSchemaTest
@Transactional
class MigrationSchemaTest {

    @Autowired
    private Flyway flyway;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbc;

    /** Every migration on the classpath has been applied on startup. */
    @Test
    void migrationsRunOnStartup() {
        assertThat(flyway.info().pending()).isEmpty();
        assertThat(flyway.info().applied()).isNotEmpty();
    }

    /**
     * {@code users.role} is the native {@code user_role} enum, not a varchar,
     * and every Java constant exists in it.
     */
    @ParameterizedTest
    @EnumSource(Role.class)
    void userRoleRoundTripsThroughNativeEnum(Role role) {
        Long id = userRepository.saveAndFlush(user("schema-" + role.name().toLowerCase(), role)).getId();
        entityManager.clear();

        assertThat(userRepository.findById(id))
                .get()
                .extracting(User::getRole)
                .isEqualTo(role);
    }

    /**
     * {@code users.status} is the native {@code user_status} enum, and every
     * Java constant exists in it.
     */
    @ParameterizedTest
    @EnumSource(UserStatus.class)
    void userStatusRoundTripsThroughNativeEnum(UserStatus status) {
        User user = user("status-" + status.name().toLowerCase(), Role.USER);
        user.setStatus(status);
        Long id = userRepository.saveAndFlush(user).getId();
        entityManager.clear();

        assertThat(userRepository.findById(id))
                .get()
                .extracting(User::getStatus)
                .isEqualTo(status);
    }

    /** {@code posts.status} is the native {@code post_status} enum, and every Java constant exists in it. */
    @ParameterizedTest
    @EnumSource(PostStatus.class)
    void postStatusRoundTripsThroughNativeEnum(PostStatus status) {
        String name = "post-" + status.name().toLowerCase();
        User author = userRepository.saveAndFlush(user(name, Role.USER));
        Long id = postRepository.saveAndFlush(Post.builder()
                .author(author)
                .title(name)
                .slug("schema-" + name)
                .content("content")
                .status(status)
                .build()).getId();
        entityManager.clear();

        assertThat(postRepository.findById(id))
                .get()
                .extracting(Post::getStatus)
                .isEqualTo(status);
    }

    /** Every table has non-null {@code created_at} and {@code updated_at} with defaults and the V7 trigger. */
    @Test
    void everyTableHasAuditTimestamps() {
        List<String> tables = jdbc.queryForList("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
                  AND table_name <> 'flyway_schema_history'
                """, String.class);
        List<String> missingColumns = jdbc.queryForList("""
                SELECT t.table_name || '.' || wanted.name
                FROM information_schema.tables t
                CROSS JOIN (VALUES ('created_at'), ('updated_at')) AS wanted(name)
                LEFT JOIN information_schema.columns c
                       ON c.table_schema = t.table_schema AND c.table_name = t.table_name
                      AND c.column_name = wanted.name AND c.is_nullable = 'NO' AND c.column_default IS NOT NULL
                WHERE t.table_schema = current_schema() AND t.table_type = 'BASE TABLE'
                  AND t.table_name <> 'flyway_schema_history' AND c.column_name IS NULL
                """, String.class);
        List<String> triggered = jdbc.queryForList("""
                SELECT event_object_table FROM information_schema.triggers
                WHERE trigger_schema = current_schema() AND action_statement LIKE '%set_updated_at()%'
                """, String.class);

        assertThat(tables).hasSize(11);
        assertThat(missingColumns).isEmpty();
        assertThat(triggered).containsExactlyInAnyOrderElementsOf(tables);
    }

    /** The timestamp columns added by V7 are mapped and filled on insert. */
    @Test
    void newTimestampColumnsRoundTrip() {
        Long categoryId = categoryRepository.saveAndFlush(
                Category.builder().name("Schema audit").slug("schema-audit").build()).getId();
        Long tagId = tagRepository.saveAndFlush(
                Tag.builder().name("schema-audit").slug("schema-audit").build()).getId();
        entityManager.clear();

        assertThat(categoryRepository.findById(categoryId)).get()
                .extracting(Category::getUpdatedAt).isNotNull();
        assertThat(tagRepository.findById(tagId)).get()
                .satisfies(tag -> {
                    assertThat(tag.getCreatedAt()).isNotNull();
                    assertThat(tag.getUpdatedAt()).isNotNull();
                });
    }

    /**
     * A bulk update that bypasses the entities still moves {@code updated_at},
     * and a value the writer sets itself is kept.
     */
    @Test
    void updatedAtFollowsUpdatesOutsideTheEntities() {
        User owner = userRepository.saveAndFlush(user("schema-audit", Role.USER));
        RefreshToken token = refreshTokenRepository.saveAndFlush(RefreshToken.builder()
                .user(owner)
                .token("a".repeat(64))
                .expiresAt(OffsetDateTime.now().plusDays(1))
                .build());
        assertThat(token.getUpdatedAt()).isNotNull();
        OffsetDateTime past = OffsetDateTime.parse("2026-01-01T00:00:00Z");

        jdbc.update("UPDATE refresh_tokens SET updated_at = ? WHERE id = ?", past, token.getId());
        assertThat(tokenUpdatedAt(token.getId())).isAtSameInstantAs(past);

        refreshTokenRepository.revokeAllActiveByUser(owner, OffsetDateTime.now());
        assertThat(tokenUpdatedAt(token.getId())).isAfter(past);
    }

    private OffsetDateTime tokenUpdatedAt(Long id) {
        return jdbc.queryForObject("SELECT updated_at FROM refresh_tokens WHERE id = ?", OffsetDateTime.class, id);
    }

    private static User user(String username, Role role) {
        return User.builder()
                .username(username)
                .email(username + "@example.com")
                .passwordHash("hash")
                .role(role)
                .build();
    }
}
