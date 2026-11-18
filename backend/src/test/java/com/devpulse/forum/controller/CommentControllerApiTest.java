package com.devpulse.forum.controller;

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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The comments API through the full security filter chain, against the real
 * schema: thread shape, who may write what, and the documented error statuses.
 * Counters and notifications are checked in
 * {@link com.devpulse.forum.service.CommentServiceIntegrationTest}.
 */
@MigratedSchemaTest
@Transactional
class CommentControllerApiTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;
    private User author;
    private User other;
    private User moderator;
    private Post post;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).defaultRequest(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf())).apply(springSecurity()).build();
        author = saveUser("author", Role.USER);
        other = saveUser("other", Role.USER);
        moderator = saveUser("mod", Role.MODERATOR);
        post = savePost("thread", PostStatus.PUBLISHED);
    }

    @Test
    void anyoneReadsRootsOldestFirstWithNestedRepliesAndPlaceholders() throws Exception {
        long first = comment(null, 0, "VISIBLE", "first", "2026-01-01T10:00:00Z");
        long reply = comment(first, 1, "DELETED", "gone", "2026-01-01T10:05:00Z");
        comment(reply, 2, "VISIBLE", "still here", "2026-01-01T10:06:00Z");
        long hidden = comment(first, 1, "HIDDEN", "moderated", "2026-01-01T10:07:00Z");
        comment(hidden, 2, "VISIBLE", "under moderated", "2026-01-01T10:08:00Z");
        comment(null, 0, "VISIBLE", "second", "2026-01-01T11:00:00Z");
        comment(null, 0, "HIDDEN", "hidden root", "2026-01-01T09:00:00Z");

        mockMvc.perform(get("/forum/posts/{slug}/comments", post.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].content").value("first"))
                .andExpect(jsonPath("$.content[0].author.username").value(author.getUsername()))
                .andExpect(jsonPath("$.content[0].parentId").value((Object) null))
                .andExpect(jsonPath("$.content[0].replies.length()").value(1))
                .andExpect(jsonPath("$.content[0].replies[0].status").value("DELETED"))
                .andExpect(jsonPath("$.content[0].replies[0].content").value((Object) null))
                .andExpect(jsonPath("$.content[0].replies[0].author").value((Object) null))
                .andExpect(jsonPath("$.content[0].replies[0].parentId").value(first))
                .andExpect(jsonPath("$.content[0].replies[0].replies[0].content").value("still here"))
                .andExpect(jsonPath("$.content[0].replies[0].replies[0].depth").value(2))
                .andExpect(jsonPath("$.content[1].content").value("second"))
                .andExpect(jsonPath("$.content[1].replies").isEmpty());
    }

    @Test
    void repliesAreLoadedDownToTheMaximumDepthAndRootsArePaged() throws Exception {
        long parent = comment(null, 0, "VISIBLE", "depth 0", "2026-01-01T10:00:00Z");
        for (int depth = 1; depth <= 5; depth++) {
            parent = comment(parent, depth, "VISIBLE", "depth " + depth, "2026-01-01T10:0" + depth + ":00Z");
        }
        comment(null, 0, "VISIBLE", "later root", "2026-01-02T10:00:00Z");

        String json = mockMvc.perform(get("/forum/posts/{slug}/comments", post.getSlug())
                        .param("size", "1").with(as(other)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.last").value(false))
                .andReturn().getResponse().getContentAsString();
        String deepest = JsonPath.read(json, "$.content[0].replies[0].replies[0].replies[0].replies[0].replies[0].content");
        assertThat(deepest).isEqualTo("depth 5");

        mockMvc.perform(get("/forum/posts/{slug}/comments", post.getSlug()).param("page", "1").param("size", "1"))
                .andExpect(jsonPath("$.content[0].content").value("later root"));
        mockMvc.perform(get("/forum/posts/{slug}/comments", post.getSlug()).param("size", "51"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/forum/posts/{slug}/comments", post.getSlug()).param("page", "-1"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void commentsOfUnreadablePostsAreNotFound() throws Exception {
        Post draft = savePost("draft", PostStatus.DRAFT);
        Post deleted = savePost("deleted", PostStatus.DELETED);

        mockMvc.perform(get("/forum/posts/{slug}/comments", draft.getSlug()).with(as(other)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/forum/posts/{slug}/comments", draft.getSlug()).with(as(author)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/forum/posts/{slug}/comments", deleted.getSlug()).with(as(moderator)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/forum/posts/{slug}/comments", "no-such-post-" + run))
                .andExpect(status().isNotFound());
    }

    @Test
    void signedInUsersCommentAndReply() throws Exception {
        String json = create(post, "{\"content\":\"  Hello  \"}", other)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("Hello"))
                .andExpect(jsonPath("$.status").value("VISIBLE"))
                .andExpect(jsonPath("$.depth").value(0))
                .andExpect(jsonPath("$.parentId").value((Object) null))
                .andExpect(jsonPath("$.postId").value(post.getId()))
                .andExpect(jsonPath("$.author.username").value(other.getUsername()))
                .andExpect(jsonPath("$.voteScore").value(0))
                .andExpect(jsonPath("$.replies").isEmpty())
                .andReturn().getResponse().getContentAsString();
        long root = ((Number) JsonPath.read(json, "$.id")).longValue();

        create(post, "{\"content\":\"Reply\",\"parentId\":" + root + "}", author)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.parentId").value(root))
                .andExpect(jsonPath("$.depth").value(1));
        create(post, "{\"content\":\"Anonymous\"}", null).andExpect(status().isUnauthorized());
        create(post, "{\"content\":\"   \"}", other)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.content").exists());
        create(post, "{\"content\":\"" + "x".repeat(10_001) + "\"}", other).andExpect(status().isBadRequest());
    }

    @Test
    void repliesNeedAListedParentOfThePostWithinTheMaximumDepth() throws Exception {
        long deepest = comment(null, 0, "VISIBLE", "root", "2026-01-01T10:00:00Z");
        for (int depth = 1; depth <= 5; depth++) {
            deepest = comment(deepest, depth, "VISIBLE", "depth " + depth, "2026-01-01T10:0" + depth + ":00Z");
        }
        long deleted = comment(null, 0, "DELETED", "gone", "2026-01-01T11:00:00Z");
        long hidden = comment(null, 0, "HIDDEN", "moderated", "2026-01-01T12:00:00Z");
        Post elsewhere = savePost("elsewhere", PostStatus.PUBLISHED);

        create(post, "{\"content\":\"Too deep\",\"parentId\":" + deepest + "}", other)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        create(post, "{\"content\":\"To the deleted\",\"parentId\":" + deleted + "}", other)
                .andExpect(status().isConflict());
        create(post, "{\"content\":\"To the hidden\",\"parentId\":" + hidden + "}", other)
                .andExpect(status().isNotFound());
        create(elsewhere, "{\"content\":\"Wrong post\",\"parentId\":" + deepest + "}", other)
                .andExpect(status().isNotFound());
        create(post, "{\"content\":\"Missing\",\"parentId\":" + Long.MAX_VALUE + "}", other)
                .andExpect(status().isNotFound());
    }

    @Test
    void lockedPostsTakeCommentsFromStaffOnlyAndDraftsFromNobody() throws Exception {
        Post locked = savePost("locked", PostStatus.LOCKED);
        Post draft = savePost("draft", PostStatus.DRAFT);

        create(locked, "{\"content\":\"Late\"}", author).andExpect(status().isForbidden());
        create(locked, "{\"content\":\"Moderator note\"}", moderator).andExpect(status().isCreated());
        create(draft, "{\"content\":\"Own draft\"}", author).andExpect(status().isConflict());
        create(draft, "{\"content\":\"Someone's draft\"}", other).andExpect(status().isNotFound());
    }

    @Test
    void theAuthorAndStaffEditAVisibleComment() throws Exception {
        long id = comment(null, 0, "VISIBLE", "typo", "2026-01-01T10:00:00Z");

        update(id, "{\"content\":\" fixed \"}", author)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("fixed"))
                .andExpect(jsonPath("$.author.username").value(author.getUsername()));
        update(id, "{\"content\":\"moderated\"}", moderator)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.author.username").value(author.getUsername()));
        update(id, "{\"content\":\"not mine\"}", other).andExpect(status().isForbidden());
        update(id, "{\"content\":\"\"}", author).andExpect(status().isBadRequest());
        update(id, "{\"content\":\"anonymous\"}", null).andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("SELECT content FROM comments WHERE id = ?", String.class, id))
                .isEqualTo("moderated");

        long deleted = comment(null, 0, "DELETED", "gone", "2026-01-01T11:00:00Z");
        update(deleted, "{\"content\":\"back\"}", author).andExpect(status().isNotFound());
        update(Long.MAX_VALUE, "{\"content\":\"nothing\"}", author).andExpect(status().isNotFound());
    }

    @Test
    void theAuthorAndStaffDeleteAVisibleCommentOnce() throws Exception {
        long own = comment(null, 0, "VISIBLE", "mine", "2026-01-01T10:00:00Z");
        long moderated = comment(null, 0, "VISIBLE", "spam", "2026-01-01T11:00:00Z");

        mockMvc.perform(delete("/forum/comments/{id}", own).with(as(other))).andExpect(status().isForbidden());
        mockMvc.perform(delete("/forum/comments/{id}", own)).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/forum/comments/{id}", own).with(as(author))).andExpect(status().isNoContent());
        mockMvc.perform(delete("/forum/comments/{id}", own).with(as(author))).andExpect(status().isNotFound());
        mockMvc.perform(delete("/forum/comments/{id}", moderated).with(as(moderator)))
                .andExpect(status().isNoContent());

        assertThat(jdbc.queryForList("SELECT CAST(status AS text) FROM comments WHERE id IN (?, ?)",
                String.class, own, moderated)).containsOnly("DELETED");
    }

    @Test
    void onALockedPostOnlyStaffChangeComments() throws Exception {
        Post locked = savePost("frozen", PostStatus.LOCKED);
        long id = commentOn(locked, null, 0, "VISIBLE", "frozen", "2026-01-01T10:00:00Z");

        update(id, "{\"content\":\"edit\"}", author).andExpect(status().isForbidden());
        mockMvc.perform(delete("/forum/comments/{id}", id).with(as(author))).andExpect(status().isForbidden());
        update(id, "{\"content\":\"staff edit\"}", moderator).andExpect(status().isOk());
        mockMvc.perform(delete("/forum/comments/{id}", id).with(as(moderator))).andExpect(status().isNoContent());
    }

    private ResultActions create(Post target, String body, User by) throws Exception {
        var request = post("/forum/posts/{slug}/comments", target.getSlug())
                .contentType(MediaType.APPLICATION_JSON).content(body);
        return mockMvc.perform(by == null ? request : request.with(as(by)));
    }

    private ResultActions update(long id, String body, User by) throws Exception {
        var request = patch("/forum/comments/{id}", id).contentType(MediaType.APPLICATION_JSON).content(body);
        return mockMvc.perform(by == null ? request : request.with(as(by)));
    }

    private long comment(Long parentId, int depth, String commentStatus, String text, String createdAt) {
        return commentOn(post, parentId, depth, commentStatus, text, createdAt);
    }

    private long commentOn(Post target, Long parentId, int depth, String commentStatus, String text, String createdAt) {
        return jdbc.queryForObject("INSERT INTO comments (post_id, user_id, parent_id, content, status, depth, created_at) "
                        + "VALUES (?, ?, ?, ?, CAST(? AS comment_status), ?, CAST(? AS timestamptz)) RETURNING id",
                Long.class, target.getId(), author.getId(), parentId, text, commentStatus, depth, createdAt);
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
