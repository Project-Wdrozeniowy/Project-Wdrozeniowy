package com.devpulse.forum.controller;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.repository.PostRepository;
import com.devpulse.support.MigratedSchemaTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * {@code POST /forum/posts/{slug}/openings} through the full security filter
 * chain, against the real schema: what counts as an opening, and that nothing
 * else moves the count. Simultaneous delivery is covered by
 * {@code PostOpeningConcurrencyTest}.
 */
@MigratedSchemaTest
@Transactional
class PostOpeningApiTest {

    private static final OffsetDateTime LONG_AGO = OffsetDateTime.of(2020, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private EntityManager entityManager;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;
    private User author;
    private User reader;
    private User moderator;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        author = saveUser("author", Role.USER);
        reader = saveUser("reader", Role.USER);
        moderator = saveUser("mod", Role.MODERATOR);
    }

    @Test
    void aGuestOpeningAddsOneItsReplayNothingAndAFreshOpeningOneMore() throws Exception {
        Post post = savePost("opened", PostStatus.PUBLISHED);
        String opening = UUID.randomUUID().toString();

        open(post.getSlug(), opening).andExpect(status().isNoContent());
        assertThat(viewCount(post)).isEqualTo(1);

        open(post.getSlug(), opening).andExpect(status().isNoContent());
        assertThat(viewCount(post)).isEqualTo(1);

        open(post.getSlug(), UUID.randomUUID().toString()).andExpect(status().isNoContent());
        assertThat(viewCount(post)).isEqualTo(2);
        assertThat(events(post)).isEqualTo(2);
    }

    @Test
    void aMembersOpeningIsTheirsAndAGuestsBelongsToNobody() throws Exception {
        Post post = savePost("attributed", PostStatus.PUBLISHED);
        String memberOpening = UUID.randomUUID().toString();
        String guestOpening = UUID.randomUUID().toString();

        perform(openRequest(post.getSlug(), memberOpening).with(as(reader))).andExpect(status().isNoContent());
        open(post.getSlug(), guestOpening).andExpect(status().isNoContent());

        assertThat(openedBy(memberOpening)).isEqualTo(reader.getId());
        assertThat(openedBy(guestOpening)).isNull();
        assertThat(viewCount(post)).isEqualTo(2);
    }

    @Test
    void lockedPostsCanBeOpened() throws Exception {
        Post post = savePost("locked", PostStatus.LOCKED);

        open(post.getSlug(), UUID.randomUUID().toString()).andExpect(status().isNoContent());

        assertThat(viewCount(post)).isEqualTo(1);
    }

    @Test
    void theListTheDetailAndStaffAnalyticsShowTheSameCount() throws Exception {
        Post post = savePost("consistent", PostStatus.PUBLISHED);
        open(post.getSlug(), UUID.randomUUID().toString());
        open(post.getSlug(), UUID.randomUUID().toString());
        entityManager.clear();

        mockMvc.perform(get("/forum/posts/{slug}", post.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.viewCount").value(2));
        mockMvc.perform(get("/forum/posts").param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == %d)].viewCount".formatted(post.getId()), hasItem(2)));
        mockMvc.perform(get("/analytics/posts/{id}", post.getId()).with(as(moderator)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.viewCount").value(2));
    }

    @Test
    void readingAddsNothing() throws Exception {
        Post post = savePost("read", PostStatus.PUBLISHED);

        mockMvc.perform(get("/forum/posts/{slug}", post.getSlug())).andExpect(status().isOk());
        mockMvc.perform(get("/forum/posts/{slug}", post.getSlug()).with(as(reader))).andExpect(status().isOk());
        mockMvc.perform(get("/forum/posts")).andExpect(status().isOk());
        mockMvc.perform(get("/analytics/posts/{id}", post.getId()).with(as(moderator))).andExpect(status().isOk());
        mockMvc.perform(get("/analytics/trending-posts")).andExpect(status().isOk());
        mockMvc.perform(get("/recommendations/posts")).andExpect(status().isOk());

        assertThat(viewCount(post)).isZero();
        assertThat(events(post)).isZero();
    }

    @Test
    void postsTheCallerCannotReadAddNothing() throws Exception {
        Post draft = savePost("draft", PostStatus.DRAFT);
        Post deleted = savePost("deleted", PostStatus.DELETED);

        open(draft.getSlug(), UUID.randomUUID().toString()).andExpect(status().isNotFound());
        perform(openRequest(draft.getSlug(), UUID.randomUUID().toString()).with(as(reader)))
                .andExpect(status().isNotFound());
        open(deleted.getSlug(), UUID.randomUUID().toString()).andExpect(status().isNotFound());
        open("no-such-post-" + run, UUID.randomUUID().toString()).andExpect(status().isNotFound());

        assertThat(viewCount(draft)).isZero();
        assertThat(viewCount(deleted)).isZero();
        assertThat(events(draft) + events(deleted)).isZero();
    }

    @Test
    void anInvalidOpeningIdIsRejectedAndNamed() throws Exception {
        Post post = savePost("invalid", PostStatus.PUBLISHED);

        send(post.getSlug(), "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.openingId").value("openingId is required"));
        for (String invalid : new String[] {"", "abc", "3f0a7c52-9d1e-4b6a-8a43"}) {
            open(post.getSlug(), invalid)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.openingId").value("openingId must be a UUID"));
        }

        assertThat(viewCount(post)).isZero();
    }

    @Test
    void anOpeningWithoutACsrfTokenIsRefused() throws Exception {
        Post post = savePost("csrf", PostStatus.PUBLISHED);

        mockMvc.perform(post("/forum/posts/{slug}/openings", post.getSlug())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(UUID.randomUUID().toString())))
                .andExpect(status().isForbidden());

        assertThat(viewCount(post)).isZero();
    }

    @Test
    void anOpeningDoesNotMoveThePostsUpdatedAtButAnEditDoes() throws Exception {
        Post post = savePost("timestamps", PostStatus.PUBLISHED);
        jdbc.update("UPDATE posts SET updated_at = ? WHERE id = ?", LONG_AGO, post.getId());

        open(post.getSlug(), UUID.randomUUID().toString()).andExpect(status().isNoContent());

        assertThat(viewCount(post)).isEqualTo(1);
        assertThat(updatedAt(post)).isEqualTo(LONG_AGO);

        jdbc.update("UPDATE posts SET title = 'Edited' WHERE id = ?", post.getId());
        assertThat(updatedAt(post)).isAfter(LONG_AGO);
    }

    @Test
    void savingAPostKeepsACountThatMovedInTheMeantime() {
        Post post = savePost("kept", PostStatus.PUBLISHED);
        postRepository.flush();
        jdbc.update("UPDATE posts SET view_count = 5 WHERE id = ?", post.getId());

        post.setTitle("Edited meanwhile");
        postRepository.saveAndFlush(post);

        assertThat(viewCount(post)).isEqualTo(5);
    }

    private ResultActions open(String slug, String openingId) throws Exception {
        return perform(openRequest(slug, openingId));
    }

    private ResultActions send(String slug, String json) throws Exception {
        return perform(post("/forum/posts/{slug}/openings", slug)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    private ResultActions perform(MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request.with(csrf()));
    }

    private static MockHttpServletRequestBuilder openRequest(String slug, String openingId) {
        return post("/forum/posts/{slug}/openings", slug)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(openingId));
    }

    private static String body(String openingId) {
        return "{\"openingId\": \"" + openingId + "\"}";
    }

    private int viewCount(Post post) {
        return jdbc.queryForObject("SELECT view_count FROM posts WHERE id = ?", Integer.class, post.getId());
    }

    private OffsetDateTime updatedAt(Post post) {
        return jdbc.queryForObject("SELECT updated_at FROM posts WHERE id = ?", OffsetDateTime.class, post.getId());
    }

    private int events(Post post) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM activity_events WHERE event_type = 'POST_VIEWED' AND entity_id = ?",
                Integer.class, post.getId());
    }

    private Long openedBy(String openingId) {
        return jdbc.queryForObject("SELECT user_id FROM activity_events WHERE opening_id = ?",
                Long.class, UUID.fromString(openingId));
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
