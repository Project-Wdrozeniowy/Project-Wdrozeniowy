package com.devpulse.forum.controller;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.forum.entity.Category;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.repository.CategoryRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The votes API through the full security filter chain, against the real
 * schema: cast, repeat, switch and retract on posts and comments, the caller's
 * vote on post reads, and the target and ownership rules.
 */
@MigratedSchemaTest
@Transactional
class VoteControllerApiTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;
    private User author;
    private String voter;
    private String otherVoter;
    private Category category;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        author = saveUser("author");
        voter = saveUser("voter").getUsername();
        otherVoter = saveUser("other").getUsername();
        category = categoryRepository.save(Category.builder().name("Votes " + run).slug("votes-" + run).build());
    }

    @Test
    void aPostVoteCanBeCastRepeatedSwitchedAndRetracted() throws Exception {
        Post post = savePost("cast", PostStatus.PUBLISHED);

        String json = vote(voter, "POST", post.getId(), "UP")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.entityType").value("POST"))
                .andExpect(jsonPath("$.entityId").value(post.getId()))
                .andExpect(jsonPath("$.voteType").value("UP"))
                .andExpect(jsonPath("$.newScore").value(1))
                .andExpect(jsonPath("$.createdAt").exists())
                .andReturn().getResponse().getContentAsString();
        int voteId = JsonPath.read(json, "$.id");

        vote(voter, "POST", post.getId(), "UP")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(voteId))
                .andExpect(jsonPath("$.newScore").value(1));
        vote(voter, "POST", post.getId(), "DOWN")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(voteId))
                .andExpect(jsonPath("$.voteType").value("DOWN"))
                .andExpect(jsonPath("$.newScore").value(-1));

        mockMvc.perform(delete("/forum/votes/{id}", voteId).with(as(otherVoter)))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        mockMvc.perform(delete("/forum/votes/{id}", voteId).with(as(voter)))
                .andExpect(status().isNoContent());
        assertThat(postScore(post)).isZero();
        mockMvc.perform(delete("/forum/votes/{id}", voteId).with(as(voter)))
                .andExpect(status().isNotFound());
    }

    @Test
    void postReadsShowTheCallersVote() throws Exception {
        Post post = savePost("mine", PostStatus.PUBLISHED);
        String json = vote(voter, "POST", post.getId(), "DOWN").andReturn().getResponse().getContentAsString();
        int voteId = JsonPath.read(json, "$.id");

        mockMvc.perform(get("/forum/posts/{slug}", post.getSlug()).with(as(voter)))
                .andExpect(jsonPath("$.voteScore").value(-1))
                .andExpect(jsonPath("$.myVote.id").value(voteId))
                .andExpect(jsonPath("$.myVote.voteType").value("DOWN"));
        mockMvc.perform(get("/forum/posts").param("categorySlug", category.getSlug()).with(as(voter)))
                .andExpect(jsonPath("$.content[0].myVote.voteType").value("DOWN"));
        mockMvc.perform(get("/forum/posts/{slug}", post.getSlug()).with(as(otherVoter)))
                .andExpect(jsonPath("$.myVote").value((Object) null));
        mockMvc.perform(get("/forum/posts/{slug}", post.getSlug()))
                .andExpect(jsonPath("$.myVote").value((Object) null));
    }

    @Test
    void votesOfSeveralUsersAddUp() throws Exception {
        Post post = savePost("several", PostStatus.PUBLISHED);

        vote(voter, "POST", post.getId(), "UP").andExpect(status().isCreated());
        vote(otherVoter, "POST", post.getId(), "UP").andExpect(status().isCreated());
        vote(author.getUsername(), "POST", post.getId(), "DOWN")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.newScore").value(1));
    }

    @Test
    void aCommentVoteMovesTheCommentScore() throws Exception {
        Post post = savePost("comment", PostStatus.PUBLISHED);
        long commentId = saveComment(post, "VISIBLE");

        String json = vote(voter, "COMMENT", commentId, "UP")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.entityType").value("COMMENT"))
                .andExpect(jsonPath("$.entityId").value(commentId))
                .andExpect(jsonPath("$.newScore").value(1))
                .andReturn().getResponse().getContentAsString();
        vote(voter, "COMMENT", commentId, "DOWN")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newScore").value(-1));
        mockMvc.perform(delete("/forum/votes/{id}", (int) JsonPath.read(json, "$.id")).with(as(voter)))
                .andExpect(status().isNoContent());

        assertThat(commentScore(commentId)).isZero();
        assertThat(postScore(post)).isZero();
    }

    @Test
    void onlyPublishedPostsAndTheirVisibleCommentsTakeVotes() throws Exception {
        vote(voter, "POST", Long.MAX_VALUE, "UP")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Post not found"));
        vote(voter, "POST", savePost("deleted", PostStatus.DELETED).getId(), "UP")
                .andExpect(status().isNotFound());
        Post draft = savePost("draft", PostStatus.DRAFT);
        vote(voter, "POST", draft.getId(), "UP").andExpect(status().isNotFound());
        vote(author.getUsername(), "POST", draft.getId(), "UP")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Only published posts can be voted on"));
        Post locked = savePost("locked", PostStatus.LOCKED);
        vote(voter, "POST", locked.getId(), "UP")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Post is locked"));
        vote(voter, "COMMENT", saveComment(locked, "VISIBLE"), "UP").andExpect(status().isForbidden());
        vote(voter, "COMMENT", saveComment(savePost("hidden", PostStatus.PUBLISHED), "HIDDEN"), "UP")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Comment not found"));
    }

    @Test
    void writesNeedAuthenticationAndAValidBody() throws Exception {
        Post post = savePost("anonymous", PostStatus.PUBLISHED);

        mockMvc.perform(post("/forum/votes").contentType(MediaType.APPLICATION_JSON)
                        .content(voteBody("POST", post.getId(), "UP")))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/forum/votes/{id}", 1))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/forum/votes").with(as(voter)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"entityType\": \"POST\", \"entityId\": " + post.getId() + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.voteType").exists());
        assertThat(postScore(post)).isZero();
    }

    private ResultActions vote(String username, String entityType, long entityId, String voteType) throws Exception {
        return mockMvc.perform(post("/forum/votes").with(as(username))
                .contentType(MediaType.APPLICATION_JSON)
                .content(voteBody(entityType, entityId, voteType)));
    }

    private static String voteBody(String entityType, long entityId, String voteType) {
        return """
                {"entityType": "%s", "entityId": %d, "voteType": "%s"}
                """.formatted(entityType, entityId, voteType);
    }

    private Post savePost(String name, PostStatus postStatus) {
        return postRepository.save(Post.builder()
                .author(author)
                .category(category)
                .title(name)
                .slug(name + "-" + run)
                .content("Body")
                .status(postStatus)
                .lastActivityAt(OffsetDateTime.now())
                .build());
    }

    private long saveComment(Post post, String commentStatus) {
        return jdbc.queryForObject("INSERT INTO comments (post_id, user_id, content, status) "
                        + "VALUES (?, ?, 'Comment', CAST(? AS comment_status)) RETURNING id",
                Long.class, post.getId(), author.getId(), commentStatus);
    }

    private int postScore(Post post) {
        return jdbc.queryForObject("SELECT vote_score FROM posts WHERE id = ?", Integer.class, post.getId());
    }

    private int commentScore(long commentId) {
        return jdbc.queryForObject("SELECT vote_score FROM comments WHERE id = ?", Integer.class, commentId);
    }

    private User saveUser(String name) {
        String username = name + "-" + run;
        return userRepository.save(User.builder()
                .username(username)
                .email(username + "@example.com")
                .passwordHash("hash")
                .role(Role.USER)
                .build());
    }

    private static RequestPostProcessor as(String username) {
        return user(username).roles(Role.USER.name());
    }
}
