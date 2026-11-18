package com.devpulse.notification.controller;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.support.MigratedSchemaTest;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Where comment notifications lead, against the real schema: the recipient
 * gets the post slug and comment id while both are readable, and an
 * unavailable destination without any detail once they are not.
 */
@MigratedSchemaTest
@Transactional
class NotificationDestinationApiTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;
    @Autowired private EntityManagerFactory entityManagerFactory;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;
    private User recipient;
    private User replier;
    private User other;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        recipient = saveUser("recipient");
        replier = saveUser("replier");
        other = saveUser("other");
    }

    @Test
    void aReplyThroughTheApiLeadsTheRecipientToTheReply() throws Exception {
        long post = savePost("discussed", other, "PUBLISHED");
        long parent = comment(post, recipient, "VISIBLE");

        String created = mockMvc.perform(post("/forum/posts/{slug}/comments", slug("discussed"))
                        .with(as(replier)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"A reply\", \"parentId\": " + parent + "}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long reply = ((Number) JsonPath.read(created, "$.id")).longValue();

        String list = mockMvc.perform(get("/notifications").with(as(recipient)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].type").value("REPLY_TO_COMMENT"))
                .andExpect(jsonPath("$.content[0].entityType").value("COMMENT"))
                .andExpect(jsonPath("$.content[0].entityId").value(reply))
                .andExpect(jsonPath("$.content[0].destination.available").value(true))
                .andExpect(jsonPath("$.content[0].destination.postSlug").value(slug("discussed")))
                .andExpect(jsonPath("$.content[0].destination.commentId").value(reply))
                .andExpect(jsonPath("$.content[0].destination.unavailableReason").value((Object) null))
                .andReturn().getResponse().getContentAsString();
        long notification = ((Number) JsonPath.read(list, "$.content[0].id")).longValue();

        mockMvc.perform(patch("/notifications/{id}/read", notification).with(as(recipient)).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true))
                .andExpect(jsonPath("$.destination.postSlug").value(slug("discussed")))
                .andExpect(jsonPath("$.destination.commentId").value(reply));
        mockMvc.perform(patch("/notifications/{id}/read", notification).with(as(other)).with(csrf()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.destination").doesNotExist());
        mockMvc.perform(get("/notifications").with(as(other)))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void unreadableDiscussionsAreUnavailableWithoutNamingThePostOrComment() throws Exception {
        long published = savePost("published", other, "PUBLISHED");
        long locked = savePost("locked", other, "LOCKED");
        long deletedPost = savePost("deleted-post", other, "DELETED");
        long foreignDraft = savePost("foreign-draft", other, "DRAFT");
        long ownDraft = savePost("own-draft", recipient, "DRAFT");

        long visible = notifyAbout(comment(published, replier, "VISIBLE"), "COMMENT_ON_POST", 1);
        long onLocked = notifyAbout(comment(locked, replier, "VISIBLE"), "REPLY_TO_COMMENT", 2);
        long deletedComment = notifyAbout(comment(published, replier, "DELETED"), "COMMENT_ON_POST", 3);
        long hiddenComment = notifyAbout(comment(published, replier, "HIDDEN"), "REPLY_TO_COMMENT", 4);
        long onDeletedPost = notifyAbout(comment(deletedPost, replier, "VISIBLE"), "COMMENT_ON_POST", 5);
        long onForeignDraft = notifyAbout(comment(foreignDraft, replier, "VISIBLE"), "COMMENT_ON_POST", 6);
        long onOwnDraft = notifyAbout(comment(ownDraft, replier, "VISIBLE"), "COMMENT_ON_POST", 7);
        long missing = notifyAbout(missingCommentId(), "COMMENT_ON_POST", 8);
        long vote = notification("VOTE_ON_POST", "POST", published, 9);
        long postEntity = notification("COMMENT_ON_POST", "POST", published, 10);

        String body = mockMvc.perform(get("/notifications").param("size", "50").with(as(recipient)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(10))
                .andReturn().getResponse().getContentAsString();

        assertAvailable(body, visible, "published");
        assertAvailable(body, onLocked, "locked");
        assertAvailable(body, onOwnDraft, "own-draft");
        assertUnavailable(body, deletedComment, "COMMENT_UNAVAILABLE");
        assertUnavailable(body, hiddenComment, "COMMENT_UNAVAILABLE");
        assertUnavailable(body, missing, "COMMENT_UNAVAILABLE");
        assertUnavailable(body, onDeletedPost, "POST_UNAVAILABLE");
        assertUnavailable(body, onForeignDraft, "POST_UNAVAILABLE");
        assertThat(JsonPath.<Object>read(body, "$.content[?(@.id == " + vote + ")].destination")).asList()
                .containsExactly((Object) null);
        assertThat(JsonPath.<Object>read(body, "$.content[?(@.id == " + postEntity + ")].destination")).asList()
                .containsExactly((Object) null);
        assertThat(body).doesNotContain(slug("deleted-post")).doesNotContain(slug("foreign-draft"));
    }

    @Test
    void aPageResolvesItsDestinationsInOneQueryWhateverItsSize() throws Exception {
        long published = savePost("counted", other, "PUBLISHED");
        for (int i = 0; i < 6; i++) {
            notifyAbout(comment(published, replier, "VISIBLE"), "COMMENT_ON_POST", i + 1);
        }
        entityManager.flush();

        long small = statementsFor("1");
        long large = statementsFor("6");

        assertThat(large).isEqualTo(small);
    }

    private long statementsFor(String size) throws Exception {
        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        entityManager.clear();
        statistics.setStatisticsEnabled(true);
        statistics.clear();
        try {
            mockMvc.perform(get("/notifications").param("size", size).with(as(recipient)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].destination.available").value(true));
            return statistics.getPrepareStatementCount();
        } finally {
            statistics.setStatisticsEnabled(false);
        }
    }

    private void assertAvailable(String body, long notification, String postName) {
        String path = "$.content[?(@.id == " + notification + ")].destination";
        assertThat(JsonPath.<Object>read(body, path + ".available")).asList().containsExactly(true);
        assertThat(JsonPath.<Object>read(body, path + ".postSlug")).asList().containsExactly(slug(postName));
        assertThat(JsonPath.<Object>read(body, path + ".commentId")).asList().hasSize(1).doesNotContainNull();
        assertThat(JsonPath.<Object>read(body, path + ".unavailableReason")).asList().containsExactly((Object) null);
    }

    private void assertUnavailable(String body, long notification, String reason) {
        String path = "$.content[?(@.id == " + notification + ")].destination";
        assertThat(JsonPath.<Object>read(body, path + ".available")).asList().containsExactly(false);
        assertThat(JsonPath.<Object>read(body, path + ".postSlug")).asList().containsExactly((Object) null);
        assertThat(JsonPath.<Object>read(body, path + ".commentId")).asList().containsExactly((Object) null);
        assertThat(JsonPath.<Object>read(body, path + ".unavailableReason")).asList().containsExactly(reason);
    }

    private long notifyAbout(long commentId, String type, int minutesAgo) {
        return notification(type, "COMMENT", commentId, minutesAgo);
    }

    private long notification(String type, String entityType, long entityId, int minutesAgo) {
        return jdbc.queryForObject("""
                INSERT INTO notifications (recipient_id, sender_id, type, entity_type, entity_id, message, created_at)
                VALUES (?, ?, CAST(? AS notification_type), ?, ?, 'Message', now() - make_interval(mins => ?))
                RETURNING id
                """, Long.class, recipient.getId(), replier.getId(), type, entityType, entityId, minutesAgo);
    }

    private long missingCommentId() {
        return jdbc.queryForObject("SELECT coalesce(max(id), 0) + 1000 FROM comments", Long.class);
    }

    private long savePost(String name, User author, String status) {
        return jdbc.queryForObject("""
                INSERT INTO posts (user_id, title, slug, content, status)
                VALUES (?, ?, ?, 'Body', CAST(? AS post_status)) RETURNING id
                """, Long.class, author.getId(), name, slug(name), status);
    }

    private long comment(long post, User author, String status) {
        return jdbc.queryForObject("""
                INSERT INTO comments (post_id, user_id, content, status)
                VALUES (?, ?, 'Comment', CAST(? AS comment_status)) RETURNING id
                """, Long.class, post, author.getId(), status);
    }

    private String slug(String name) {
        return name + "-" + run;
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

    private static RequestPostProcessor as(User user) {
        return user(user.getUsername()).roles(Role.USER.name());
    }
}
