package com.devpulse.forum.controller;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.forum.entity.Category;
import com.devpulse.forum.repository.CategoryRepository;
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

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * {@code GET /forum/tags} through the full security filter chain, against the
 * real schema. Posts are created through the posts API, so the counts are the
 * ones {@code PostService} maintains (PWDRZ-143).
 */
@MigratedSchemaTest
@Transactional
class TagControllerApiTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;
    private String author;
    private Category category;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).defaultRequest(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf())).apply(springSecurity()).build();
        author = "tagger-" + run;
        userRepository.save(User.builder()
                .username(author)
                .email(author + "@example.com")
                .passwordHash("hash")
                .role(Role.USER)
                .build());
        category = categoryRepository.save(Category.builder().name("Tags " + run).slug("tags-" + run).build());
    }

    @Test
    void anonymousCallersGetTagsByPostCountThenName() throws Exception {
        String popular = tag("popular");
        String alpha = tag("alpha");
        String beta = tag("beta");
        createPost(false, popular, beta);
        createPost(false, popular, alpha);
        createPost(false, popular);

        Map<String, Integer> counts = listedCounts();

        assertThat(counts).containsEntry(popular, 3).containsEntry(alpha, 1).containsEntry(beta, 1);
        // The tie between alpha and beta is broken by name, so the order is the same on every call.
        assertThat(counts.keySet()).containsSubsequence(popular, alpha, beta);
        assertThat(listedCounts().keySet()).containsExactlyElementsOf(counts.keySet());
    }

    @Test
    void theTagDtoHasTheDocumentedFields() throws Exception {
        String java = tag("java");
        createPost(false, java);

        mockMvc.perform(get("/forum/tags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.slug == '%s')].id", java).isNotEmpty())
                .andExpect(jsonPath("$[?(@.slug == '%s')].name", java).value(java))
                .andExpect(jsonPath("$[?(@.slug == '%s')].postCount", java).value(1));
    }

    @Test
    void tagsOfDraftsAndDeletedPostsAreLeftOut() throws Exception {
        String draftOnly = tag("draft-only");
        String deleted = tag("deleted");
        String kept = tag("kept");
        createPost(true, draftOnly);
        String post = createPost(false, deleted, kept);
        createPost(false, kept);

        mockMvc.perform(delete("/forum/posts/{slug}", post).with(user(author).roles(Role.USER.name())))
                .andExpect(status().isNoContent());

        Map<String, Integer> counts = listedCounts();
        assertThat(counts).doesNotContainKeys(draftOnly, deleted).containsEntry(kept, 1);
    }

    @Test
    void aTagPageCombinesTheTagWithThePostFilter() throws Exception {
        String spring = tag("spring");
        createPost(false, spring);
        createPost(false, spring);
        createPost(true, spring);

        mockMvc.perform(get("/forum/posts").param("tag", spring))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(listedCounts().get(spring)))
                .andExpect(jsonPath("$.content.length()").value(2));
    }

    @Test
    void theListIsEmptyWhenNoPublishedPostHasATag() throws Exception {
        createPost(true, tag("draft"));
        jdbcTemplate.update("UPDATE tags SET post_count = 0");

        mockMvc.perform(get("/forum/tags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void theRedundantPostsByTagPathIsGone() throws Exception {
        String go = tag("go");
        createPost(false, go);

        mockMvc.perform(get("/forum/tags/{slug}/posts", go))
                .andExpect(status().isNotFound());
    }

    /** A tag name unique to this run; tag names are stored lower-case. */
    private String tag(String name) {
        return name + "-" + run;
    }

    /** Creates a post with the given tags as the author and returns its slug. */
    private String createPost(boolean draft, String... tags) throws Exception {
        String tagList = Arrays.stream(tags).map(t -> "\"" + t + "\"").collect(Collectors.joining(", "));
        String json = mockMvc.perform(post("/forum/posts").with(user(author).roles(Role.USER.name()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title": "Post %s %s", "content": "Body", "categoryId": %d,
                                 "tags": [%s], "draft": %s}
                                """.formatted(run, UUID.randomUUID(), category.getId(), tagList, draft)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.slug");
    }

    /** The listed tags of this run in response order, with their post counts. */
    private Map<String, Integer> listedCounts() throws Exception {
        String json = mockMvc.perform(get("/forum/tags"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Map<String, Object>> tags = JsonPath.read(json, "$[*]");
        return tags.stream()
                .filter(t -> ((String) t.get("slug")).endsWith("-" + run))
                .collect(Collectors.toMap(t -> (String) t.get("slug"), t -> (Integer) t.get("postCount"),
                        (a, b) -> a, LinkedHashMap::new));
    }
}
