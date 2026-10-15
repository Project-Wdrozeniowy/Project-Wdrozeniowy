package com.devpulse.forum.service;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
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

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Concurrent subscribe requests of one user, each in a transaction of its
 * own, against the real schema: all succeed and leave a single row.
 */
@MigratedSchemaTest
class PostSubscriptionConcurrencyTest {

    private static final int THREADS = 8;

    @Autowired private PostSubscriptionService subscriptionService;
    @Autowired private UserRepository userRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);
    private User user;
    private Post post;

    @BeforeEach
    void setUp() {
        user = userRepository.save(User.builder()
                .username("subscriber-" + run)
                .email("subscriber-" + run + "@example.com")
                .passwordHash("hash")
                .role(Role.USER)
                .build());
        post = postRepository.save(Post.builder()
                .author(user)
                .title("Concurrent subscriptions")
                .slug("concurrent-subscriptions-" + run)
                .content("Body")
                .status(PostStatus.PUBLISHED)
                .lastActivityAt(OffsetDateTime.now())
                .build());
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM posts WHERE id = ?", post.getId());
        jdbc.update("DELETE FROM users WHERE id = ?", user.getId());
    }

    @Test
    void simultaneousSubscriptionsOfOneUserLeaveOneRow() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(THREADS);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<?>> futures = new ArrayList<>();
            for (int i = 0; i < THREADS; i++) {
                futures.add(executor.submit(() -> {
                    start.await();
                    SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                            user.getUsername(), null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));
                    try {
                        subscriptionService.subscribe(post.getSlug());
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> future : futures) {
                future.get(30, TimeUnit.SECONDS);
            }
        } finally {
            executor.shutdownNow();
        }

        assertThat(jdbc.queryForObject("SELECT count(*) FROM post_subscriptions WHERE post_id = ?",
                Integer.class, post.getId())).isOne();
    }
}
