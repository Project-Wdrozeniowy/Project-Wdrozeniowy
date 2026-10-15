package com.devpulse.forum.service;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.VoteRequest;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.enums.VoteEntityType;
import com.devpulse.forum.enums.VoteType;
import com.devpulse.forum.repository.PostRepository;
import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Concurrent votes against the real schema, each request in a transaction of
 * its own: no duplicate votes and no lost score updates.
 */
@MigratedSchemaTest
class VoteConcurrencyTest {

    private static final int THREADS = 8;

    @Autowired private VoteService voteService;
    @Autowired private UserRepository userRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);
    private final List<User> users = new ArrayList<>();
    private Post post;

    @BeforeEach
    void setUp() {
        for (int i = 0; i < THREADS; i++) {
            users.add(userRepository.save(User.builder()
                    .username("concurrent-" + i + "-" + run)
                    .email("concurrent-" + i + "-" + run + "@example.com")
                    .passwordHash("hash")
                    .role(Role.USER)
                    .build()));
        }
        post = postRepository.save(Post.builder()
                .author(users.get(0))
                .title("Concurrent votes")
                .slug("concurrent-votes-" + run)
                .content("Body")
                .status(PostStatus.PUBLISHED)
                .lastActivityAt(OffsetDateTime.now())
                .build());
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM posts WHERE id = ?", post.getId());
        users.forEach(user -> jdbc.update("DELETE FROM users WHERE id = ?", user.getId()));
    }

    @Test
    void simultaneousVotesOfDifferentUsersAreAllCounted() throws Exception {
        List<Callable<Object>> votes = users.stream()
                .<Callable<Object>>map(user -> () -> cast(user, VoteType.UP))
                .toList();

        assertThat(runTogether(votes)).allMatch(VoteService.CastResult.class::isInstance);
        assertThat(score()).isEqualTo(THREADS);
        assertThat(voteRows()).isEqualTo(THREADS);
    }

    @Test
    void simultaneousIdenticalVotesOfOneUserCountOnce() throws Exception {
        User user = users.get(0);
        List<Callable<Object>> votes = users.stream()
                .<Callable<Object>>map(ignored -> () -> cast(user, VoteType.UP))
                .toList();

        List<Object> results = runTogether(votes);

        assertThat(results).filteredOn(result -> result instanceof VoteService.CastResult cast && cast.created())
                .hasSize(1);
        assertThat(score()).isEqualTo(1);
        assertThat(voteRows()).isEqualTo(1);
    }

    @Test
    void simultaneousSwitchesOfOneUserLeaveTheScoreMatchingTheStoredVote() throws Exception {
        User user = users.get(0);
        List<Callable<Object>> votes = new ArrayList<>();
        for (int i = 0; i < THREADS; i++) {
            VoteType direction = i % 2 == 0 ? VoteType.UP : VoteType.DOWN;
            votes.add(() -> cast(user, direction));
        }

        runTogether(votes);

        String stored = jdbc.queryForObject("SELECT CAST(vote_type AS text) FROM votes WHERE post_id = ?",
                String.class, post.getId());
        assertThat(score()).isEqualTo("UP".equals(stored) ? 1 : -1);
        assertThat(voteRows()).isEqualTo(1);
    }

    /** Casts as {@code user}; returns the result, or the AppException a lost race may end in. */
    private Object cast(User user, VoteType direction) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                user.getUsername(), null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));
        try {
            return voteService.cast(request(direction));
        } catch (AppException e) {
            return e;
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private VoteRequest request(VoteType direction) {
        VoteRequest request = new VoteRequest();
        ReflectionTestUtils.setField(request, "entityType", VoteEntityType.POST);
        ReflectionTestUtils.setField(request, "entityId", post.getId());
        ReflectionTestUtils.setField(request, "voteType", direction);
        return request;
    }

    /** Starts every task at the same moment and returns their results in order. */
    private static List<Object> runTogether(List<Callable<Object>> tasks) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(tasks.size());
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Object>> futures = new ArrayList<>();
            for (Callable<Object> task : tasks) {
                futures.add(executor.submit(() -> {
                    start.await();
                    return task.call();
                }));
            }
            start.countDown();
            List<Object> results = new ArrayList<>();
            for (Future<Object> future : futures) {
                results.add(future.get(30, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            executor.shutdownNow();
        }
    }

    private int score() {
        return jdbc.queryForObject("SELECT vote_score FROM posts WHERE id = ?", Integer.class, post.getId());
    }

    private int voteRows() {
        return jdbc.queryForObject("SELECT count(*) FROM votes WHERE post_id = ?", Integer.class, post.getId());
    }
}
