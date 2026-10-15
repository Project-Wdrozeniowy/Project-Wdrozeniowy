package com.devpulse.forum.controller;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.entity.UserStatus;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.repository.PostRepository;
import com.devpulse.forum.service.PostSubscriptionService;
import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Post subscriptions through the full security filter chain, against the real
 * schema: idempotent subscribe and unsubscribe, the caller's list, visibility
 * rules, and who is eligible for notifications.
 */
@MigratedSchemaTest
@Transactional
class PostSubscriptionControllerApiTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private PostSubscriptionService subscriptionService;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;
    private User author;
    private User reader;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        author = saveUser("author", UserStatus.ACTIVE);
        reader = saveUser("reader", UserStatus.ACTIVE);
    }

    @Test
    void subscribingAndUnsubscribingAreIdempotent() throws Exception {
        Post post = savePost("idempotent", PostStatus.PUBLISHED);

        mockMvc.perform(put(subscription(post)).with(as(reader))).andExpect(status().isNoContent());
        mockMvc.perform(put(subscription(post)).with(as(reader))).andExpect(status().isNoContent());
        assertThat(rows(post)).isOne();
        mockMvc.perform(get("/forum/posts/{slug}", post.getSlug()).with(as(reader)))
                .andExpect(jsonPath("$.subscribed").value(true));

        mockMvc.perform(delete(subscription(post)).with(as(reader))).andExpect(status().isNoContent());
        mockMvc.perform(delete(subscription(post)).with(as(reader))).andExpect(status().isNoContent());
        assertThat(rows(post)).isZero();
        mockMvc.perform(get("/forum/posts/{slug}", post.getSlug()).with(as(reader)))
                .andExpect(jsonPath("$.subscribed").value(false));
        mockMvc.perform(get("/forum/posts/{slug}", post.getSlug()))
                .andExpect(jsonPath("$.subscribed").value(false));
    }

    @Test
    void theListShowsOnlyTheCallersReadableSubscriptionsNewestFirst() throws Exception {
        Post first = savePost("first", PostStatus.PUBLISHED);
        Post second = savePost("second", PostStatus.LOCKED);
        Post removed = savePost("removed", PostStatus.PUBLISHED);
        subscribeAt(reader, first, "2026-01-01T00:00:00Z");
        subscribeAt(reader, second, "2026-01-02T00:00:00Z");
        subscribeAt(reader, removed, "2026-01-03T00:00:00Z");
        subscribeAt(author, first, "2026-01-04T00:00:00Z");
        jdbc.update("UPDATE posts SET status = 'DELETED' WHERE id = ?", removed.getId());

        mockMvc.perform(get("/users/me/subscriptions").with(as(reader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].slug", contains(second.getSlug(), first.getSlug())))
                .andExpect(jsonPath("$.content[0].myVote").value((Object) null))
                .andExpect(jsonPath("$.totalElements").value(2));
        mockMvc.perform(get("/users/me/subscriptions").param("size", "1").param("page", "1").with(as(reader)))
                .andExpect(jsonPath("$.content[*].slug", contains(first.getSlug())));
        mockMvc.perform(get("/users/me/subscriptions").param("size", "51").with(as(reader)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void onlyReadablePostsCanBeSubscribedTo() throws Exception {
        Post draft = savePost("draft", PostStatus.DRAFT);

        mockMvc.perform(put("/forum/posts/{slug}/subscription", "missing-" + run).with(as(reader)))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        mockMvc.perform(put(subscription(draft)).with(as(reader))).andExpect(status().isNotFound());
        mockMvc.perform(put(subscription(savePost("deleted", PostStatus.DELETED))).with(as(reader)))
                .andExpect(status().isNotFound());
        mockMvc.perform(put(subscription(draft)).with(as(author))).andExpect(status().isNoContent());
        mockMvc.perform(get("/users/me/subscriptions").with(as(author)))
                .andExpect(jsonPath("$.content", hasSize(1)));
    }

    @Test
    void anonymousCallersAreRejected() throws Exception {
        Post post = savePost("anonymous", PostStatus.PUBLISHED);

        mockMvc.perform(put(subscription(post))).andExpect(status().isUnauthorized());
        mockMvc.perform(delete(subscription(post))).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/users/me/subscriptions")).andExpect(status().isUnauthorized());
    }

    @Test
    void activeSubscribersOtherThanTheActorAreEligibleForNotifications() {
        Post post = savePost("eligible", PostStatus.PUBLISHED);
        User banned = saveUser("banned", UserStatus.BANNED);
        User bystander = saveUser("bystander", UserStatus.ACTIVE);
        subscribeAt(author, post, "2026-01-01T00:00:00Z");
        subscribeAt(reader, post, "2026-01-01T00:00:00Z");
        subscribeAt(banned, post, "2026-01-01T00:00:00Z");

        assertThat(subscriptionService.subscribersToNotify(post.getId(), reader.getId()))
                .containsExactly(author.getId())
                .doesNotContain(bystander.getId());
    }

    private String subscription(Post post) {
        return "/forum/posts/" + post.getSlug() + "/subscription";
    }

    private void subscribeAt(User user, Post post, String createdAt) {
        jdbc.update("INSERT INTO post_subscriptions (user_id, post_id, created_at) VALUES (?, ?, ?)",
                user.getId(), post.getId(), OffsetDateTime.parse(createdAt));
    }

    private int rows(Post post) {
        return jdbc.queryForObject("SELECT count(*) FROM post_subscriptions WHERE post_id = ?", Integer.class,
                post.getId());
    }

    private Post savePost(String name, PostStatus postStatus) {
        return postRepository.save(Post.builder()
                .author(author)
                .title(name)
                .slug(name + "-" + run)
                .content("Body")
                .status(postStatus)
                .lastActivityAt(OffsetDateTime.now())
                .build());
    }

    private User saveUser(String name, UserStatus userStatus) {
        String username = name + "-" + run;
        return userRepository.save(User.builder()
                .username(username)
                .email(username + "@example.com")
                .passwordHash("hash")
                .role(Role.USER)
                .status(userStatus)
                .build());
    }

    private static RequestPostProcessor as(User user) {
        return user(user.getUsername()).roles(Role.USER.name());
    }
}
