package com.devpulse.auth.session;

import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/** Deterministic interleavings of independent JDBC transactions against the real Flyway schema. */
@MigratedSchemaTest
class JdbcSessionConcurrencyTest {
    @Autowired private DataSource dataSource;
    private SessionRepository<Session> repository;

    @BeforeEach
    void setUp() {
        repository = newRepository();
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private SessionRepository<Session> newRepository() {
        var jdbc = new JdbcIndexedSessionRepository(new JdbcTemplate(dataSource),
                new TransactionTemplate(new DataSourceTransactionManager(dataSource)));
        jdbc.setDefaultMaxInactiveInterval(Duration.ofHours(1));
        return (SessionRepository) jdbc;
    }

    @Test
    void aLateSaveDoesNotReinsertADeletedSession() {
        var session = repository.createSession();
        session.setAttribute("identity", "first");
        repository.save(session);
        var pending = repository.findById(session.getId());
        repository.deleteById(session.getId());
        pending.setLastAccessedTime(Instant.now());
        pending.setAttribute("identity", "late");
        repository.save(pending);
        assertThat(repository.findById(session.getId())).isNull();
    }

    @Test
    void standardSaveCanRestoreAnOldIdAfterAnotherRequestRotatesIt() {
        var session = repository.createSession();
        repository.save(session);
        String oldId = session.getId();
        var pending = repository.findById(oldId);
        var login = repository.findById(oldId);
        String newId = login.changeSessionId();
        repository.save(login);
        pending.setLastAccessedTime(Instant.now());
        repository.save(pending);
        // Characterization, not acceptance: this demonstrates why the production
        // integration must guard an old request's update after authentication.
        assertThat(repository.findById(newId)).isNull();
        assertThat(repository.findById(oldId)).isNotNull();
        repository.deleteById(oldId);
    }

    @Test
    void deletingTheOldIdAfterRotationDoesNotDeleteTheRotatedSession() {
        var session = repository.createSession();
        repository.save(session);
        String oldId = session.getId();
        var login = repository.findById(oldId);
        String newId = login.changeSessionId();
        repository.save(login);
        repository.deleteById(oldId);
        assertThat(repository.findById(newId)).isNotNull();
        repository.deleteById(newId);
    }

    @Test
    void expiryDoesNotDependOnTheCleanupJob() {
        var session = repository.createSession();
        session.setLastAccessedTime(Instant.now().minus(Duration.ofHours(1)).minusSeconds(1));
        repository.save(session);
        assertThat(repository.findById(session.getId())).isNull();
    }

    @Test
    void aNewRepositoryCanReadPersistedAttributes() {
        var session = repository.createSession();
        session.setAttribute("authenticatedAt", Instant.now().minusSeconds(10));
        repository.save(session);
        var restarted = newRepository();
        assertThat(restarted.findById(session.getId()).<Instant>getAttribute("authenticatedAt"))
                .isEqualTo(session.<Instant>getAttribute("authenticatedAt"));
        restarted.deleteById(session.getId());
    }
}
