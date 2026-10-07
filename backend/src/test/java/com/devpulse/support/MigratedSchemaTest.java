package com.devpulse.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Boots the application against PostgreSQL with the real Flyway migrations
 * applied and Hibernate validating the JPA mapping against them.
 *
 * <p>The other Spring tests run with {@code ddl-auto=create-drop}, so Hibernate
 * builds its own tables and never sees the native enum types, defaults and
 * constraints from {@code db/migration}. Use this annotation for tests that
 * depend on the real schema. The migrations go into a dedicated
 * {@code migration_test} schema, so these tests share the test database with
 * the {@code create-drop} ones without touching their tables, and all classes
 * using the annotation share one Spring context.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.flyway.schemas=migration_test",
        "spring.flyway.default-schema=migration_test",
        "spring.datasource.hikari.schema=migration_test",
        "spring.jpa.hibernate.ddl-auto=validate"
})
public @interface MigratedSchemaTest {
}
