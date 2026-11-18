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

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Simultaneous delivery of openings against PostgreSQL, committing for real,
 * so it runs without a surrounding test transaction.
 */
@MigratedSchemaTest
class PostOpeningConcurrencyTest {

    private static final int THREADS = 8;

    @Autowired private PostService postService;
    @Autowired private UserRepository userRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private User author;
    private Post post;

    @BeforeEach
    void setUp() {
        author = userRepository.save(User.builder()
                .username("opening-" + run)
                .email("opening-" + run + "@example.com")
                .passwordHash("hash")
                .role(Role.USER)
                .build());
        post = postRepository.save(Post.builder()
                .author(author)
                .title("Concurrent openings")
                .slug("concurrent-openings-" + run)
                .content("Body")
                .status(PostStatus.PUBLISHED)
                .lastActivityAt(OffsetDateTime.now())
                .build());
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM activity_events WHERE entity_type = 'POST' AND entity_id = ?", post.getId());
        jdbc.update("DELETE FROM posts WHERE id = ?", post.getId());
        jdbc.update("DELETE FROM users WHERE id = ?", author.getId());
    }

    @Test
    void simultaneousDeliveryOfOneOpeningCountsOnce() throws Exception {
        String opening = UUID.randomUUID().toString();
        List<String> openings = new ArrayList<>();
        for (int i = 0; i < THREADS; i++) {
            openings.add(opening);
        }

        deliverTogether(openings);

        assertThat(viewCount()).isEqualTo(1);
        assertThat(events()).isEqualTo(1);
    }

    @Test
    void simultaneousDifferentOpeningsAreAllCounted() throws Exception {
        List<String> openings = new ArrayList<>();
        for (int i = 0; i < THREADS; i++) {
            openings.add(UUID.randomUUID().toString());
        }

        deliverTogether(openings);

        assertThat(viewCount()).isEqualTo(THREADS);
        assertThat(events()).isEqualTo(THREADS);
    }

    private void deliverTogether(List<String> openings) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<?>> deliveries = new ArrayList<>();
            for (String opening : openings) {
                deliveries.add(pool.submit(() -> {
                    start.await();
                    postService.recordOpening(post.getSlug(), opening);
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> delivery : deliveries) {
                delivery.get();
            }
        } finally {
            pool.shutdownNow();
        }
    }

    private int viewCount() {
        return jdbc.queryForObject("SELECT view_count FROM posts WHERE id = ?", Integer.class, post.getId());
    }

    private int events() {
        return jdbc.queryForObject(
                "SELECT count(*) FROM activity_events WHERE event_type = 'POST_VIEWED' AND entity_id = ?",
                Integer.class, post.getId());
    }
}
