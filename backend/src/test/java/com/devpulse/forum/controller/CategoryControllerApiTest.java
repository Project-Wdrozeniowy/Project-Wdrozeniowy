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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The category read API through the full security filter chain, against the
 * real schema with the default categories from migration V6.
 */
@MigratedSchemaTest
@Transactional
class CategoryControllerApiTest {

    /** Slugs of the default categories, in display order; the frontend topic filter uses them. */
    private static final List<String> DEFAULT_SLUGS =
            List.of("ai", "gaming", "politics", "science", "business", "education", "news");

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void anonymousCallersGetTheDefaultCategoriesInDisplayOrder() throws Exception {
        String json = mockMvc.perform(get("/forum/categories"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        List<String> slugs = JsonPath.read(json, "$[*].slug");
        assertThat(slugs).containsSubsequence(DEFAULT_SLUGS);
        List<String> aiNames = JsonPath.read(json, "$[?(@.slug == 'ai')].name");
        assertThat(aiNames).containsExactly("AI / Tech");
    }

    @Test
    void returnsOneVisibleCategoryBySlug() throws Exception {
        mockMvc.perform(get("/forum/categories/{slug}", "gaming"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Gaming"))
                .andExpect(jsonPath("$.displayOrder").value(2))
                .andExpect(jsonPath("$.visible").value(true))
                .andExpect(jsonPath("$.description").hasJsonPath())
                .andExpect(jsonPath("$.createdAt").exists());

        mockMvc.perform(get("/forum/categories/{slug}", "missing-" + run))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Category not found"));
    }

    @Test
    void hiddenCategoriesAreLeftOut() throws Exception {
        String hidden = "hidden-" + run;
        categoryRepository.save(Category.builder().name("Hidden " + run).slug(hidden).isVisible(false).build());

        String json = mockMvc.perform(get("/forum/categories"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<String> slugs = JsonPath.read(json, "$[*].slug");

        assertThat(slugs).doesNotContain(hidden);
        mockMvc.perform(get("/forum/categories/{slug}", hidden))
                .andExpect(status().isNotFound());
    }

    @Test
    void aPostCanBeCreatedInADefaultCategory() throws Exception {
        String author = "author-" + run;
        userRepository.save(User.builder()
                .username(author)
                .email(author + "@example.com")
                .passwordHash("hash")
                .role(Role.USER)
                .build());
        Long categoryId = categoryRepository.findBySlug("ai").orElseThrow().getId();

        mockMvc.perform(post("/forum/posts").with(user(author).roles(Role.USER.name()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title": "First post %s", "content": "Body", "categoryId": %d}
                                """.formatted(run, categoryId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category.slug").value("ai"));
    }
}
