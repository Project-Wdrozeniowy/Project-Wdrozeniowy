package com.devpulse.forum.service;

import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.UpdatePostRequest;
import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/** PWDRZ-194: force the author request to overlap an uncommitted row change. */
@MigratedSchemaTest
class PostVisibilityConcurrencyTest {
    @Autowired private PostService service;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactions;
    private String username;
    private String slug;
    private long author;
    private long post;

    @BeforeEach
    void setUp() {
        username = "visibility-race-" + UUID.randomUUID().toString().substring(0, 8);
        slug = username;
        author = jdbc.queryForObject("INSERT INTO users (username,email,password_hash,post_count) "
                + "VALUES (?,?,'hash',1) RETURNING id", Long.class, username, username + "@example.test");
        post = jdbc.queryForObject("INSERT INTO posts (user_id,title,slug,content) "
                + "VALUES (?,'Race',?,'Body') RETURNING id", Long.class, author, slug);
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM posts WHERE id=?", post);
        jdbc.update("DELETE FROM users WHERE id=?", author);
    }

    @Test
    void aConcurrentModerationLockCannotBeRemovedByTheAuthorsStaleRequest() throws Exception {
        Object outcome = overlap("UPDATE posts SET status='LOCKED' WHERE id=?");
        assertThat(outcome).isInstanceOfSatisfying(AppException.class,
                error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        assertThat(jdbc.queryForObject("SELECT status::text FROM posts WHERE id=?", String.class, post))
                .isEqualTo("LOCKED");
    }

    @Test
    void aStatusChangeDoesNotOverwriteConcurrentEngagementCounters() throws Exception {
        Object outcome = overlap("UPDATE posts SET vote_score=4,comment_count=2 WHERE id=?");
        assertThat(outcome).isNotInstanceOf(Exception.class);
        assertThat(jdbc.queryForObject("SELECT vote_score FROM posts WHERE id=?", Integer.class, post)).isEqualTo(4);
        assertThat(jdbc.queryForObject("SELECT comment_count FROM posts WHERE id=?", Integer.class, post)).isEqualTo(2);
    }

    private Object overlap(String update) throws Exception {
        var executor = Executors.newSingleThreadExecutor();
        AtomicReference<Future<Object>> future = new AtomicReference<>();
        try {
            new TransactionTemplate(transactions).executeWithoutResult(ignored -> {
                jdbc.update(update, post);
                int blocker = jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class);
                future.set(executor.submit(() -> {
                    SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                            username, null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));
                    try {
                        UpdatePostRequest request = new UpdatePostRequest();
                        request.setStatus("DRAFT");
                        return service.update(slug, request);
                    } catch (AppException error) {
                        return error;
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                }));
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                while (System.nanoTime() < deadline) {
                    boolean blocked = jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM pg_stat_activity "
                            + "WHERE ? = ANY(pg_blocking_pids(pid)))", Boolean.class, blocker);
                    if (blocked) return;
                    try {
                        Thread.sleep(20);
                    } catch (InterruptedException error) {
                        Thread.currentThread().interrupt();
                        throw new IllegalStateException(error);
                    }
                }
                throw new AssertionError("Author request did not reach the held PostgreSQL row lock");
            });
            return future.get().get(20, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
            assertThat(executor.awaitTermination(25, TimeUnit.SECONDS)).isTrue();
        }
    }
}
