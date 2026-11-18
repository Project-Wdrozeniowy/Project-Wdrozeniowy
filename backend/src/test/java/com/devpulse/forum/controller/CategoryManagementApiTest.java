package com.devpulse.forum.controller;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.forum.entity.Category;
import com.devpulse.forum.repository.CategoryRepository;
import com.devpulse.support.MigratedSchemaTest;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.aMapWithSize;
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
 * Creating, editing and deleting categories through the full security filter
 * chain, against the real schema with the default categories from migration
 * V6 (PWDRZ-141).
 */
@MigratedSchemaTest
@Transactional
class CategoryManagementApiTest {

    private static final RequestPostProcessor ADMIN = user("admin").roles(Role.ADMIN.name());
    private static final RequestPostProcessor MODERATOR = user("moderator").roles(Role.MODERATOR.name());
    private static final RequestPostProcessor USER = user("user").roles(Role.USER.name());

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private EntityManager entityManager;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).defaultRequest(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf())).apply(springSecurity()).build();
    }

    // ───────────────────────── roles ─────────────────────────

    @Test
    void onlyAdminsCreateCategories() throws Exception {
        String body = createBody("Rust " + run, "rust-" + run);

        send(post("/forum/categories"), null, body).andExpect(status().isUnauthorized());
        send(post("/forum/categories"), USER, body).andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
        send(post("/forum/categories"), MODERATOR, body).andExpect(status().isForbidden());

        assertThat(categoryRepository.findBySlug("rust-" + run)).isEmpty();
    }

    @Test
    void onlyAdminsEditAndDeleteCategories() throws Exception {
        String slug = saveCategory("Edit " + run, "edit-" + run, true).getSlug();

        send(patch("/forum/categories/{slug}", slug), null, "{\"name\": \"x\"}").andExpect(status().isUnauthorized());
        send(patch("/forum/categories/{slug}", slug), USER, "{\"name\": \"x\"}").andExpect(status().isForbidden());
        send(delete("/forum/categories/{slug}", slug), null, null).andExpect(status().isUnauthorized());
        send(delete("/forum/categories/{slug}", slug), MODERATOR, null).andExpect(status().isForbidden());

        assertThat(categoryRepository.findBySlug(slug)).get()
                .extracting(Category::getName).isEqualTo("Edit " + run);
    }

    // ───────────────────────── create ─────────────────────────

    @Test
    void anAdminCreatesACategoryThatEveryoneThenSees() throws Exception {
        String slug = "rust-" + run;
        send(post("/forum/categories"), ADMIN, """
                {"name": "  Rust %s  ", "slug": "%s", "description": "Systems programming", "displayOrder": 8}
                """.formatted(run, slug))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Rust " + run))
                .andExpect(jsonPath("$.slug").value(slug))
                .andExpect(jsonPath("$.description").value("Systems programming"))
                .andExpect(jsonPath("$.displayOrder").value(8))
                .andExpect(jsonPath("$.visible").value(true))
                .andExpect(jsonPath("$.createdAt").exists());

        mockMvc.perform(get("/forum/categories/{slug}", slug)).andExpect(status().isOk());
        assertThat(publicSlugs()).contains(slug);
    }

    @Test
    void omittedOptionalFieldsGetTheirDefaults() throws Exception {
        send(post("/forum/categories"), ADMIN, """
                {"name": "Plain %s", "slug": "plain-%s", "description": "   "}
                """.formatted(run, run))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.description").doesNotExist())
                .andExpect(jsonPath("$.displayOrder").value(0))
                .andExpect(jsonPath("$.visible").value(true));
    }

    @Test
    void aCategoryCanBeCreatedHidden() throws Exception {
        String slug = "hidden-" + run;
        send(post("/forum/categories"), ADMIN, """
                {"name": "Hidden %s", "slug": "%s", "visible": false}
                """.formatted(run, slug))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.visible").value(false));

        mockMvc.perform(get("/forum/categories/{slug}", slug)).andExpect(status().isNotFound());
        assertThat(publicSlugs()).doesNotContain(slug);
    }

    @Test
    void aTakenNameOrSlugIsAConflictThatNamesTheField() throws Exception {
        // "AI / Tech" with slug "ai" is a default category; names compare ignoring case.
        send(post("/forum/categories"), ADMIN, createBody("ai / tech", "ai-" + run))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Category name or slug already exists"))
                .andExpect(jsonPath("$.errors", aMapWithSize(1)))
                .andExpect(jsonPath("$.errors.name").value("Name is already used by another category"));

        send(post("/forum/categories"), ADMIN, createBody("Artificial " + run, "ai"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors", aMapWithSize(1)))
                .andExpect(jsonPath("$.errors.slug").value("Slug is already used by another category"));

        send(post("/forum/categories"), ADMIN, createBody("Gaming", "gaming"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors", aMapWithSize(2)));
    }

    @Test
    void invalidFieldsAreRejectedWithReadableMessages() throws Exception {
        send(post("/forum/categories"), ADMIN, """
                {"name": "  ", "slug": "Not A Slug", "description": "%s", "displayOrder": -1}
                """.formatted("d".repeat(1001)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors", aMapWithSize(4)))
                .andExpect(jsonPath("$.errors.name").value("Name must not be blank"))
                .andExpect(jsonPath("$.errors.slug")
                        .value("Slug must be lower-case letters and digits joined by single hyphens"))
                .andExpect(jsonPath("$.errors.description").value("Description must be at most 1000 characters"))
                .andExpect(jsonPath("$.errors.displayOrder").value("Display order must be at least 0"));

        send(post("/forum/categories"), ADMIN, "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").value("Name must not be blank"))
                .andExpect(jsonPath("$.errors.slug").value("Slug must not be blank"));
    }

    // ───────────────────────── update ─────────────────────────

    @Test
    void anAdminHidesAndShowsACategoryAgain() throws Exception {
        String slug = saveCategory("Toggle " + run, "toggle-" + run, true).getSlug();

        send(patch("/forum/categories/{slug}", slug), ADMIN, "{\"visible\": false}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.visible").value(false))
                .andExpect(jsonPath("$.name").value("Toggle " + run));
        mockMvc.perform(get("/forum/categories/{slug}", slug)).andExpect(status().isNotFound());

        // A hidden category is still managed by its slug.
        send(patch("/forum/categories/{slug}", slug), ADMIN, "{\"visible\": true}")
                .andExpect(status().isOk());
        mockMvc.perform(get("/forum/categories/{slug}", slug)).andExpect(status().isOk());
    }

    @Test
    void anUpdateChangesOnlyTheGivenFields() throws Exception {
        Category category = saveCategory("Before " + run, "before-" + run, true);
        category.setDescription("Old description");
        category.setDisplayOrder(3);

        send(patch("/forum/categories/{slug}", category.getSlug()), ADMIN, """
                {"name": "After %s", "slug": "after-%s", "description": ""}
                """.formatted(run, run))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(category.getId()))
                .andExpect(jsonPath("$.name").value("After " + run))
                .andExpect(jsonPath("$.slug").value("after-" + run))
                .andExpect(jsonPath("$.description").doesNotExist())
                .andExpect(jsonPath("$.displayOrder").value(3))
                .andExpect(jsonPath("$.visible").value(true));

        mockMvc.perform(get("/forum/categories/{slug}", "before-" + run)).andExpect(status().isNotFound());
        mockMvc.perform(get("/forum/categories/{slug}", "after-" + run)).andExpect(status().isOk());
    }

    @Test
    void aCategoryKeepsItsOwnNameAndSlugWithoutAConflict() throws Exception {
        String slug = saveCategory("Same " + run, "same-" + run, true).getSlug();

        send(patch("/forum/categories/{slug}", slug), ADMIN, """
                {"name": "SAME %s", "slug": "%s", "displayOrder": 9}
                """.formatted(run, slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("SAME " + run))
                .andExpect(jsonPath("$.displayOrder").value(9));
    }

    @Test
    void renamingToAnotherCategorysNameOrSlugIsAConflict() throws Exception {
        String slug = saveCategory("Mine " + run, "mine-" + run, true).getSlug();

        send(patch("/forum/categories/{slug}", slug), ADMIN, "{\"name\": \"Gaming\", \"slug\": \"news\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors.name").value("Name is already used by another category"))
                .andExpect(jsonPath("$.errors.slug").value("Slug is already used by another category"));

        assertThat(categoryRepository.findBySlug(slug)).get()
                .extracting(Category::getName).isEqualTo("Mine " + run);
    }

    @Test
    void anUpdateValidatesTheFieldsItGets() throws Exception {
        String slug = saveCategory("Valid " + run, "valid-" + run, true).getSlug();

        send(patch("/forum/categories/{slug}", slug), ADMIN, "{\"name\": \" \", \"slug\": \"-bad-\", \"displayOrder\": -5}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors", aMapWithSize(3)))
                .andExpect(jsonPath("$.errors.name").value("Name must not be blank"));
    }

    @Test
    void anUnknownSlugIs404ForAnAdmin() throws Exception {
        send(patch("/forum/categories/{slug}", "missing-" + run), ADMIN, "{\"visible\": true}")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Category not found"));
        send(delete("/forum/categories/{slug}", "missing-" + run), ADMIN, null)
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    // ───────────────────────── delete ─────────────────────────

    @Test
    void deletingACategoryKeepsItsPostsWithoutACategory() throws Exception {
        Category category = saveCategory("Doomed " + run, "doomed-" + run, true);
        String author = "writer-" + run;
        userRepository.save(User.builder()
                .username(author)
                .email(author + "@example.com")
                .passwordHash("hash")
                .role(Role.USER)
                .build());
        String json = mockMvc.perform(post("/forum/posts").with(user(author).roles(Role.USER.name()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title": "Kept %s", "content": "Body", "categoryId": %d}
                                """.formatted(run, category.getId())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String post = JsonPath.read(json, "$.slug");
        // Each request has its own persistence context; start the delete without the post's.
        entityManager.flush();
        entityManager.clear();

        send(delete("/forum/categories/{slug}", category.getSlug()), ADMIN, null)
                .andExpect(status().isNoContent());
        entityManager.clear();

        assertThat(categoryRepository.findBySlug(category.getSlug())).isEmpty();
        mockMvc.perform(get("/forum/posts/{slug}", post))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Kept " + run))
                .andExpect(jsonPath("$.category").doesNotExist());
    }

    @Test
    void aHiddenCategoryCanBeDeleted() throws Exception {
        String slug = saveCategory("Gone " + run, "gone-" + run, false).getSlug();

        send(delete("/forum/categories/{slug}", slug), ADMIN, null).andExpect(status().isNoContent());

        assertThat(categoryRepository.findBySlug(slug)).isEmpty();
    }

    private ResultActions send(MockHttpServletRequestBuilder request, RequestPostProcessor caller, String body)
            throws Exception {
        if (caller != null) {
            request.with(caller);
        }
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mockMvc.perform(request);
    }

    private static String createBody(String name, String slug) {
        return "{\"name\": \"%s\", \"slug\": \"%s\"}".formatted(name, slug);
    }

    private Category saveCategory(String name, String slug, boolean visible) {
        return categoryRepository.save(Category.builder().name(name).slug(slug).isVisible(visible).build());
    }

    private List<String> publicSlugs() throws Exception {
        String json = mockMvc.perform(get("/forum/categories"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$[*].slug");
    }
}
