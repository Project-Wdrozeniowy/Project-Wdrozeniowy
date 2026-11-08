package com.devpulse.auth.session;

import org.h2.jdbcx.JdbcDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.core.io.ClassPathResource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

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

/** Repository interleavings with an in-memory database; PostgreSQL evidence is tested separately. */

class JdbcSessionRepositoryTest {
    private DataSource dataSource;
    private SessionRepository<Session> repository;

    @BeforeEach
    void setUp() {
        var database = new JdbcDataSource();
        database.setURL("jdbc:h2:mem:" + java.util.UUID.randomUUID() + ";DB_CLOSE_DELAY=-1");
        dataSource = database;
        new ResourceDatabasePopulator(new ClassPathResource("org/springframework/session/jdbc/schema-h2.sql")).execute(dataSource);
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
        var at = Instant.now().minusSeconds(10);
        var principal = new SessionPrincipal(1L, "alice", 3, at);
        var context = org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
        context.setAuthentication(org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated(
                principal, null, java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER"))));
        session.setAttribute("SPRING_SECURITY_CONTEXT", context);
        repository.save(session);
        session.changeSessionId();
        session.setAttribute("csrfRenewal", "new-token");
        repository.save(session);
        var restarted = newRepository();
        var restored = restarted.findById(session.getId())
                .<org.springframework.security.core.context.SecurityContext>getAttribute("SPRING_SECURITY_CONTEXT");
        assertThat(restored.getAuthentication().getPrincipal()).isEqualTo(principal);
        assertThat(((SessionPrincipal) restored.getAuthentication().getPrincipal()).authenticatedAt()).isEqualTo(at);
        assertThat(restored.getAuthentication().getCredentials()).isNull();
        restarted.deleteById(session.getId());
    }
}
