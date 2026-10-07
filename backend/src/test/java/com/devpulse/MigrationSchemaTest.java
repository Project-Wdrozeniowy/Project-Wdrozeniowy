package com.devpulse;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Applies the real Flyway migrations to PostgreSQL and checks that the JPA
 * mapping works against the schema they produce.
 *
 * <p>The other Spring tests run with {@code ddl-auto=create-drop}, so Hibernate
 * builds its own tables and never sees the native enum types, defaults and
 * constraints from {@code db/migration}. This test uses a dedicated schema, so
 * it shares the test database without touching the tables those tests create.
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.flyway.schemas=" + MigrationSchemaTest.SCHEMA,
        "spring.flyway.default-schema=" + MigrationSchemaTest.SCHEMA,
        "spring.datasource.hikari.schema=" + MigrationSchemaTest.SCHEMA,
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Transactional
class MigrationSchemaTest {

    static final String SCHEMA = "migration_test";

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

    /** {@code users.role} is the native {@code user_role} enum, not a varchar. */
    @Test
    void userRoleRoundTripsThroughNativeEnum() {
        Long id = userRepository.saveAndFlush(user("schema-admin", Role.ADMIN)).getId();
        entityManager.clear();

        assertThat(userRepository.findById(id))
                .get()
                .extracting(User::getRole)
                .isEqualTo(Role.ADMIN);
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
