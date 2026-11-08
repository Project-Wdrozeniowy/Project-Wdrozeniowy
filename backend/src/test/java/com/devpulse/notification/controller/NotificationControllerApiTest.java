package com.devpulse.notification.controller;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.support.MigratedSchemaTest;
import jakarta.persistence.EntityManager;
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
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The notifications API through the full security filter chain, against the
 * real schema: the caller's list, read state and deletion, and that nobody
 * can see or change another user's notifications.
 */
@MigratedSchemaTest
@Transactional
class NotificationControllerApiTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;
    private User recipient;
    private User other;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).defaultRequest(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf())).apply(springSecurity()).build();
        recipient = saveUser("recipient");
        other = saveUser("other");
    }

    @Test
    void theListShowsTheCallersNotificationsNewestFirst() throws Exception {
        long older = notify(recipient, other, "COMMENT_ON_POST", "2026-01-01T00:00:00Z", true);
        long newer = notify(recipient, null, "SYSTEM", "2026-01-02T00:00:00Z", false);
        notify(other, recipient, "VOTE_ON_POST", "2026-01-03T00:00:00Z", false);

        mockMvc.perform(get("/notifications").with(as(recipient)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id", contains((int) newer, (int) older)))
                .andExpect(jsonPath("$.content[0].type").value("SYSTEM"))
                .andExpect(jsonPath("$.content[0].senderUsername").value((Object) null))
                .andExpect(jsonPath("$.content[0].read").value(false))
                .andExpect(jsonPath("$.content[1].senderUsername").value(other.getUsername()))
                .andExpect(jsonPath("$.content[1].entityType").value("POST"))
                .andExpect(jsonPath("$.totalElements").value(2));
        mockMvc.perform(get("/notifications").param("unreadOnly", "true").with(as(recipient)))
                .andExpect(jsonPath("$.content[*].id", contains((int) newer)))
                .andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/notifications").param("size", "51").with(as(recipient)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aNotificationIsMarkedReadOnlyByItsRecipient() throws Exception {
        long id = notify(recipient, other, "COMMENT_ON_POST", "2026-01-01T00:00:00Z", false);

        mockMvc.perform(patch("/notifications/{id}/read", id).with(as(other)))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        assertThat(isRead(id)).isFalse();

        mockMvc.perform(patch("/notifications/{id}/read", id).with(as(recipient)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.read").value(true));
        mockMvc.perform(patch("/notifications/{id}/read", id).with(as(recipient)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));
        mockMvc.perform(patch("/notifications/{id}/read", Long.MAX_VALUE).with(as(recipient)))
                .andExpect(status().isNotFound());
    }

    @Test
    void readAllChangesOnlyTheCallersNotifications() throws Exception {
        long first = notify(recipient, other, "COMMENT_ON_POST", "2026-01-01T00:00:00Z", false);
        long second = notify(recipient, other, "VOTE_ON_POST", "2026-01-02T00:00:00Z", false);
        long foreign = notify(other, recipient, "VOTE_ON_POST", "2026-01-03T00:00:00Z", false);

        mockMvc.perform(patch("/notifications/read-all").with(as(recipient)))
                .andExpect(status().isNoContent());

        assertThat(isRead(first)).isTrue();
        assertThat(isRead(second)).isTrue();
        assertThat(isRead(foreign)).isFalse();
    }

    @Test
    void aNotificationIsDeletedOnlyByItsRecipient() throws Exception {
        long id = notify(recipient, other, "MENTION", "2026-01-01T00:00:00Z", false);

        mockMvc.perform(delete("/notifications/{id}", id).with(as(other)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/notifications/{id}", id).with(as(recipient)))
                .andExpect(status().isNoContent());
        entityManager.flush();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM notifications WHERE id = ?", Integer.class, id))
                .isZero();
        mockMvc.perform(delete("/notifications/{id}", id).with(as(recipient)))
                .andExpect(status().isNotFound());
    }

    @Test
    void anonymousCallersAreRejected() throws Exception {
        mockMvc.perform(get("/notifications")).andExpect(status().isUnauthorized());
        mockMvc.perform(patch("/notifications/read-all")).andExpect(status().isUnauthorized());
        mockMvc.perform(patch("/notifications/{id}/read", 1)).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/notifications/{id}", 1)).andExpect(status().isUnauthorized());
    }

    private long notify(User to, User from, String type, String createdAt, boolean read) {
        return jdbc.queryForObject("INSERT INTO notifications "
                        + "(recipient_id, sender_id, type, entity_type, entity_id, message, is_read, created_at) "
                        + "VALUES (?, ?, CAST(? AS notification_type), 'POST', 1, 'Message', ?, ?) RETURNING id",
                Long.class, to.getId(), from == null ? null : from.getId(), type, read,
                OffsetDateTime.parse(createdAt));
    }

    private boolean isRead(long id) {
        return jdbc.queryForObject("SELECT is_read FROM notifications WHERE id = ?", Boolean.class, id);
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
