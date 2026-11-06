package com.devpulse.ai.controller;

import com.devpulse.auth.entity.Role;
import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.hamcrest.Matchers.aMapWithSize;
import static org.hamcrest.Matchers.contains;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * {@code POST /ai/suggest-tags} through the full security filter chain,
 * against the real schema. No AI provider is configured in tests, so the
 * suggestions come from keyword extraction; the provider paths are covered by
 * {@code TagSuggestionServiceTest} and {@code AiTagClientTest} (PWDRZ-147).
 */
@MigratedSchemaTest
@Transactional
class AiControllerApiTest {

    @Autowired private WebApplicationContext context;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void anonymousCallersAreRejected() throws Exception {
        mockMvc.perform(post("/ai/suggest-tags")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"Spring Boot with PostgreSQL\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void withoutAProviderTheSuggestionsComeFromKeywordsAndExistingTags() throws Exception {
        // Only this test's tag is in use, inside the rolled-back transaction.
        jdbc.update("UPDATE tags SET post_count = 0");
        String tag = "flyway-" + run;
        jdbc.update("INSERT INTO tags (name, slug, post_count) VALUES (?, ?, 1)", tag, tag);

        suggest("{\"title\": \"Migrations\", \"content\": \"Run Flyway %s migrations with Spring\"}"
                .formatted(run))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiGenerated").value(false))
                .andExpect(jsonPath("$.tags", contains(tag, "migrations", "run", "spring")));
    }

    @Test
    void contentWithoutKeywordsGivesNoSuggestions() throws Exception {
        suggest("{\"content\": \"and the for are but\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tags").isEmpty())
                .andExpect(jsonPath("$.aiGenerated").value(false));
    }

    @Test
    void invalidRequestsNameTheFields() throws Exception {
        suggest("{\"title\": \"%s\", \"content\": \"short\"}".formatted("t".repeat(256)))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors", aMapWithSize(2)))
                .andExpect(jsonPath("$.errors.content").value("Content must be between 10 and 50000 characters"))
                .andExpect(jsonPath("$.errors.title").value("Title must be at most 255 characters"));

        suggest("{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.content").value("Content must not be blank"));
    }

    private ResultActions suggest(String body) throws Exception {
        return mockMvc.perform(post("/ai/suggest-tags")
                .with(user("writer-" + run).roles(Role.USER.name()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }
}
