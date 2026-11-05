package com.devpulse.analytics.controller;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.repository.PostRepository;
import com.devpulse.support.MigratedSchemaTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The analytics API through the full security filter chain, against the real
 * schema: the figures are checked against seeded posts, comments, votes and
 * views, and every operation's role rule is checked.
 */
@MigratedSchemaTest
@Transactional
class AnalyticsControllerApiTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;
    private User author;
    private User reader;
    private User moderator;
    private User admin;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        author = saveUser("author", Role.USER);
        reader = saveUser("reader", Role.USER);
        moderator = saveUser("mod", Role.MODERATOR);
        admin = saveUser("admin", Role.ADMIN);
    }

    @Test
    void myActivityCountsOwnContentAndTheVotesItReceived() throws Exception {
        Post published = savePost("published", PostStatus.PUBLISHED);
        savePost("locked", PostStatus.LOCKED);
        savePost("draft", PostStatus.DRAFT);
        long comment = saveComment(published, author, "VISIBLE");
        saveComment(published, author, "HIDDEN");
        vote(reader, published.getId(), null, "UP");
        vote(moderator, published.getId(), null, "DOWN");
        vote(reader, null, comment, "UP");
        vote(author, published.getId(), null, "UP");

        mockMvc.perform(get("/analytics/me").with(as(author)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(author.getUsername()))
                .andExpect(jsonPath("$.totalPosts").value(2))
                .andExpect(jsonPath("$.totalComments").value(1))
                .andExpect(jsonPath("$.totalVotesCast").value(1))
                .andExpect(jsonPath("$.totalUpvotesReceived").value(3))
                .andExpect(jsonPath("$.totalDownvotesReceived").value(1))
                .andExpect(jsonPath("$.lastActivityAt").exists());
        mockMvc.perform(get("/analytics/me").with(as(admin)))
                .andExpect(jsonPath("$.totalPosts").value(0))
                .andExpect(jsonPath("$.lastActivityAt").value((Object) null));
        mockMvc.perform(get("/analytics/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void postAnalyticsCountRecordedViewsForStaffOnly() throws Exception {
        Post post = savePost("viewed", PostStatus.PUBLISHED);
        mockMvc.perform(get("/forum/posts/{slug}", post.getSlug())).andExpect(status().isOk());
        mockMvc.perform(get("/forum/posts/{slug}", post.getSlug()).with(as(reader))).andExpect(status().isOk());
        mockMvc.perform(get("/forum/posts/{slug}", post.getSlug()).with(as(reader))).andExpect(status().isOk());
        saveComment(post, reader, "VISIBLE");
        vote(reader, post.getId(), null, "UP");
        jdbc.update("UPDATE posts SET vote_score = 1 WHERE id = ?", post.getId());
        jdbc.update("INSERT INTO post_subscriptions (user_id, post_id) VALUES (?, ?)", reader.getId(), post.getId());

        mockMvc.perform(get("/analytics/posts/{id}", post.getId()).with(as(moderator)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.postTitle").value("viewed"))
                .andExpect(jsonPath("$.viewCount").value(3))
                .andExpect(jsonPath("$.uniqueViewCount").value(1))
                .andExpect(jsonPath("$.commentCount").value(1))
                .andExpect(jsonPath("$.voteScore").value(1))
                .andExpect(jsonPath("$.upvoteCount").value(1))
                .andExpect(jsonPath("$.downvoteCount").value(0))
                .andExpect(jsonPath("$.subscriptionCount").value(1));
        mockMvc.perform(get("/analytics/posts/{id}", post.getId()).with(as(reader))).andExpect(status().isForbidden());
        mockMvc.perform(get("/analytics/posts/{id}", Long.MAX_VALUE).with(as(admin))).andExpect(status().isNotFound());
    }

    @Test
    void thePlatformSummaryMatchesTheDatabaseForAdminsOnly() throws Exception {
        savePost("summary", PostStatus.PUBLISHED);

        String json = mockMvc.perform(get("/analytics/summary").with(as(admin)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(number(json, "$.totalUsers")).isEqualTo(count("SELECT count(*) FROM users"));
        assertThat(number(json, "$.activeUsers")).isEqualTo(count("SELECT count(*) FROM users WHERE status = 'ACTIVE'"));
        assertThat(number(json, "$.totalPosts"))
                .isEqualTo(count("SELECT count(*) FROM posts WHERE status IN ('PUBLISHED', 'LOCKED')"));
        assertThat(number(json, "$.totalCategories")).isEqualTo(count("SELECT count(*) FROM categories"));
        mockMvc.perform(get("/analytics/summary").with(as(moderator))).andExpect(status().isForbidden());
    }

    @Test
    void trendsCountTodaysRowsPerDay() throws Exception {
        savePost("trend-1", PostStatus.PUBLISHED);
        savePost("trend-2", PostStatus.PUBLISHED);
        long before = count("SELECT count(*) FROM posts WHERE created_at >= now() - interval '7 days'");

        String json = mockMvc.perform(get("/analytics/trends").param("metric", "posts").param("period", "7d")
                        .with(as(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metric").value("posts"))
                .andExpect(jsonPath("$.period").value("7d"))
                .andReturn().getResponse().getContentAsString();

        List<String> days = JsonPath.read(json, "$.data[*].date");
        assertThat(days).hasSizeBetween(7, 8).last().isEqualTo(LocalDate.now(ZoneOffset.UTC).toString());
        assertThat(number(json, "$.total")).isEqualTo(before);
        mockMvc.perform(get("/analytics/trends").param("metric", "likes").with(as(admin)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/analytics/trends").param("period", "1y").with(as(admin)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/analytics/trends").with(as(moderator))).andExpect(status().isForbidden());
    }

    @Test
    void trendingPostsRankPublicActivityInTheWindowForAnyone() throws Exception {
        Post busy = savePost("busy", PostStatus.PUBLISHED);
        Post quiet = savePost("quiet", PostStatus.PUBLISHED);
        Post idle = savePost("idle", PostStatus.PUBLISHED);
        Post draft = savePost("hidden", PostStatus.DRAFT);
        saveComment(busy, reader, "VISIBLE");
        vote(reader, busy.getId(), null, "UP");
        vote(reader, quiet.getId(), null, "UP");
        vote(reader, draft.getId(), null, "UP");

        String json = mockMvc.perform(get("/analytics/trending-posts").param("period", "24h").param("limit", "50"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<String> slugs = JsonPath.read(json, "$[*].slug");

        assertThat(slugs).containsSubsequence(busy.getSlug(), quiet.getSlug())
                .doesNotContain(idle.getSlug(), draft.getSlug());
        mockMvc.perform(get("/analytics/trending-posts").param("limit", "0")).andExpect(status().isBadRequest());
        mockMvc.perform(get("/analytics/trending-posts").param("limit", "51")).andExpect(status().isBadRequest());
        mockMvc.perform(get("/analytics/trending-posts").param("period", "90d")).andExpect(status().isBadRequest());
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

    private long saveComment(Post post, User by, String commentStatus) {
        return jdbc.queryForObject("INSERT INTO comments (post_id, user_id, content, status) "
                        + "VALUES (?, ?, 'Comment', CAST(? AS comment_status)) RETURNING id",
                Long.class, post.getId(), by.getId(), commentStatus);
    }

    private void vote(User by, Long postId, Long commentId, String voteType) {
        jdbc.update("INSERT INTO votes (user_id, post_id, comment_id, vote_type) VALUES (?, ?, ?, CAST(? AS vote_type))",
                by.getId(), postId, commentId, voteType);
    }

    private long count(String sql) {
        return jdbc.queryForObject(sql, Long.class);
    }

    private static long number(String json, String path) {
        return ((Number) JsonPath.read(json, path)).longValue();
    }

    private User saveUser(String name, Role role) {
        String username = name + "-" + run;
        return userRepository.save(User.builder()
                .username(username)
                .email(username + "@example.com")
                .passwordHash("hash")
                .role(role)
                .build());
    }

    private static RequestPostProcessor as(User user) {
        return user(user.getUsername()).roles(user.getRole().name());
    }
}
