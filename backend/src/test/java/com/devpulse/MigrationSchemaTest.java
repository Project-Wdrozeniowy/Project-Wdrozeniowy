package com.devpulse;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.entity.UserStatus;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.support.MigratedSchemaTest;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

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
    private EntityManager entityManager;

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

    private static User user(String username, Role role) {
        return User.builder()
                .username(username)
                .email(username + "@example.com")
                .passwordHash("hash")
                .role(role)
                .build();
    }
}
