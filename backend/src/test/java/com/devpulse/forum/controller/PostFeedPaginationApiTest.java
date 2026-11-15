package com.devpulse.forum.controller;

import com.devpulse.support.MigratedSchemaTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pagination of {@code GET /forum/posts} against the real schema, for a
 * guest: the documented defaults and bounds, stable consecutive pages, empty
 * pages, the client errors for invalid input, and a response made of exactly
 * the fields the committed contract documents. Each test lists only the posts
 * of its own category.
 */
@MigratedSchemaTest
@Transactional
class PostFeedPaginationApiTest {

    private static final OffsetDateTime BASE = OffsetDateTime.parse("2021-06-01T12:00:00Z");

    @Autowired private WebApplicationContext context;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;
    private long author;
    private long category;
    /** The category's public posts, newest activity first. */
    private final List<String> listed = new ArrayList<>();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        author = jdbc.queryForObject(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, 'hash') RETURNING id",
                Long.class, "pager-" + run, "pager-" + run + "@example.com");
        category = jdbc.queryForObject("""
                INSERT INTO categories (name, slug, display_order) VALUES (?, ?, 900) RETURNING id
                """, Long.class, "Pager " + run, "pager-" + run);
        for (int i = 0; i < 5; i++) {
            listed.add(0, post("p" + i, i % 2 == 0 ? "PUBLISHED" : "LOCKED", i));
        }
        post("draft", "DRAFT", 10);
        post("deleted", "DELETED", 11);
    }

    @Test
    void theDefaultPageHoldsTheCategorysPublicPostsInTheDocumentedShape() throws Exception {
        String body = mockMvc.perform(get("/forum/posts").param("categoryId", String.valueOf(category)))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(5))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.first").value(true))
                .andExpect(jsonPath("$.last").value(true))
                .andReturn().getResponse().getContentAsString();

        assertThat(JsonPath.<List<String>>read(body, "$.content[*].slug")).containsExactlyElementsOf(listed);

        Map<String, Object> contract = JsonPath.parse(
                Files.readString(Path.of("openapi.json"), StandardCharsets.UTF_8)).read("$.components.schemas");
        Map<String, Object> page = JsonPath.read(body, "$");
        assertThat(page.keySet()).isEqualTo(properties(contract, "PagedResponsePostSummaryDto"));
        for (Map<String, Object> post : JsonPath.<List<Map<String, Object>>>read(body, "$.content")) {
            assertThat(post.keySet()).isEqualTo(properties(contract, "PostSummaryDto"));
        }
    }

    @Test
    void consecutivePagesNeitherOverlapNorSkipAndAPagePastTheEndIsEmpty() throws Exception {
        List<String> seen = new ArrayList<>();
        for (int page = 0; page < 3; page++) {
            String body = mockMvc.perform(feed().param("size", "2").param("page", String.valueOf(page)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.page").value(page))
                    .andExpect(jsonPath("$.size").value(2))
                    .andExpect(jsonPath("$.totalElements").value(5))
                    .andExpect(jsonPath("$.totalPages").value(3))
                    .andExpect(jsonPath("$.first").value(page == 0))
                    .andExpect(jsonPath("$.last").value(page == 2))
                    .andReturn().getResponse().getContentAsString();
            seen.addAll(JsonPath.<List<String>>read(body, "$.content[*].slug"));
        }
        assertThat(seen).containsExactlyElementsOf(listed);

        mockMvc.perform(feed().param("size", "2").param("page", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.page").value(3))
                .andExpect(jsonPath("$.totalElements").value(5))
                .andExpect(jsonPath("$.totalPages").value(3))
                .andExpect(jsonPath("$.first").value(false))
                .andExpect(jsonPath("$.last").value(true));
    }

    @Test
    void aFilterWithoutMatchesGivesAnEmptyFirstAndLastPage() throws Exception {
        mockMvc.perform(feed().param("q", "nothing-matches-" + run))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.totalPages").value(0))
                .andExpect(jsonPath("$.first").value(true))
                .andExpect(jsonPath("$.last").value(true));
    }

    @Test
    void theSizeBoundsAreAccepted() throws Exception {
        mockMvc.perform(feed().param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].slug").value(listed.get(0)))
                .andExpect(jsonPath("$.totalPages").value(5));
        mockMvc.perform(feed().param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(100))
                .andExpect(jsonPath("$.content.length()").value(5));
    }

    @Test
    void invalidPaginationAndFilterInputIsAProblemDetail400() throws Exception {
        String bounds = "page must be >= 0 and size between 1 and 100";
        for (String[] invalid : new String[][] {
                {"page", "-1", bounds}, {"size", "0", bounds}, {"size", "101", bounds},
                {"sort", "title", "Unsupported sort field: title"},
                {"page", "first", null}, {"size", "1.5", null}, {"status", "PENDING", null},
                {"uncategorized", "maybe", null}, {"createdTo", "tomorrow", null}}) {
            var result = mockMvc.perform(feed().param(invalid[0], invalid[1]))
                    .andExpect(status().isBadRequest())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.status").value(400));
            if (invalid[2] != null) {
                result.andExpect(jsonPath("$.detail").value(invalid[2]));
            }
        }
        mockMvc.perform(get("/forum/posts").param("categoryId", "ai"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder feed() {
        return get("/forum/posts").param("categoryId", String.valueOf(category));
    }

    @SuppressWarnings("unchecked")
    private static Set<String> properties(Map<String, Object> schemas, String name) {
        return ((Map<String, Object>) ((Map<String, Object>) schemas.get(name)).get("properties")).keySet();
    }

    private String post(String name, String status, int hoursLater) {
        String slug = name + "-" + run;
        OffsetDateTime at = BASE.plusHours(hoursLater);
        jdbc.update("""
                INSERT INTO posts (user_id, category_id, title, slug, content, status, created_at, last_activity_at)
                VALUES (?, ?, ?, ?, 'Body', CAST(? AS post_status), ?, ?)
                """, author, category, name, slug, status, at, at);
        return slug;
    }
}
