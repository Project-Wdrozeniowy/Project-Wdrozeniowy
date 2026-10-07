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
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The posts API through the full security filter chain, against the real
 * schema. Checks the JSON shape the frontend types ({@code PostSummary},
 * {@code Post}) rely on, plus authentication and request validation.
 */
@MigratedSchemaTest
@Transactional
class PostControllerApiTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;
    private String author;
    private String moderator;
    private Category category;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        author = saveUser("author", Role.USER);
        moderator = saveUser("mod", Role.MODERATOR);
        category = categoryRepository.save(Category.builder()
                .name("Api " + run)
                .slug("api-" + run)
                .description("Posts created by the API test")
                .build());
    }

    @Test
    void createdPostHasTheContractShape() throws Exception {
        mockMvc.perform(post("/forum/posts").with(as(author, Role.USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Contract shape " + run, "\"tags\": [\"Spring-Boot\"]")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.pinned").value(false))
                .andExpect(jsonPath("$.isPinned").doesNotExist())
                .andExpect(jsonPath("$.content").value("Body"))
                .andExpect(jsonPath("$.author.username").value(author))
                .andExpect(jsonPath("$.author.role").value("USER"))
                .andExpect(jsonPath("$.author.displayName").hasJsonPath())
                .andExpect(jsonPath("$.category.slug").value(category.getSlug()))
                .andExpect(jsonPath("$.category.visible").value(true))
                .andExpect(jsonPath("$.tags[0].name").value("spring-boot"))
                .andExpect(jsonPath("$.tags[0].postCount").value(1))
                .andExpect(jsonPath("$.updatedAt").exists());
    }

    @Test
    void anonymousCanReadButNotWrite() throws Exception {
        String slug = createPost("Readable " + run);

        mockMvc.perform(get("/forum/posts/{slug}", slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value(slug));
        mockMvc.perform(get("/forum/posts").param("categorySlug", category.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].slug").value(slug))
                .andExpect(jsonPath("$.content[0].content").doesNotExist())
                .andExpect(jsonPath("$.first").value(true))
                .andExpect(jsonPath("$.last").value(true));
        mockMvc.perform(post("/forum/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Anonymous " + run, null)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidRequestsAreRejected() throws Exception {
        mockMvc.perform(post("/forum/posts").with(as(author, Role.USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Bad tag " + run, "\"tags\": [\"two words\"]")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/forum/posts").with(as(author, Role.USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\": \"No category\", \"content\": \"Body\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.categoryId").exists());

        String slug = createPost("Status " + run);
        mockMvc.perform(patch("/forum/posts/{slug}", slug).with(as(author, Role.USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"DELETED\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.status").exists());
        mockMvc.perform(patch("/forum/posts/{slug}", slug).with(as(author, Role.USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\": \"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists());
    }

    @Test
    void pinnedPostsComeFirstWhenBrowsing() throws Exception {
        String older = createPost("Older " + run);
        String newer = createPost("Newer " + run);

        mockMvc.perform(patch("/forum/posts/{slug}/pin", older).with(as(author, Role.USER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/forum/posts/{slug}/pin", older).with(as(moderator, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pinned").value(true));

        mockMvc.perform(get("/forum/posts").param("categorySlug", category.getSlug()))
                .andExpect(jsonPath("$.content[0].slug").value(older))
                .andExpect(jsonPath("$.content[1].slug").value(newer));
        // A text search is ordered by the sort field only.
        mockMvc.perform(get("/forum/posts").param("categorySlug", category.getSlug()).param("q", run))
                .andExpect(jsonPath("$.content[0].slug").value(newer));
    }

    private String createPost(String title) throws Exception {
        String json = mockMvc.perform(post("/forum/posts").with(as(author, Role.USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(title, null)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.slug");
    }

    private String body(String title, String extra) {
        return "{\"title\": \"" + title + "\", \"content\": \"Body\", \"categoryId\": " + category.getId()
                + (extra == null ? "" : ", " + extra) + "}";
    }

    private String saveUser(String name, Role role) {
        String username = name + "-" + run;
        userRepository.save(User.builder()
                .username(username)
                .email(username + "@example.com")
                .passwordHash("hash")
                .role(role)
                .build());
        return username;
    }

    private static RequestPostProcessor as(String username, Role role) {
        return user(username).roles(role.name());
    }
}
