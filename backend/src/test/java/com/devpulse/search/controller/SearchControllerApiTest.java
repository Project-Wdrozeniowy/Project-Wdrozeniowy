package com.devpulse.search.controller;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.entity.UserStatus;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.entity.Tag;
import com.devpulse.forum.repository.PostRepository;
import com.devpulse.forum.repository.TagRepository;
import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The search API through the full security filter chain, against the real
 * schema: what each kind finds, what stays hidden, the type filter, paging and
 * query validation.
 */
@MigratedSchemaTest
@Transactional
class SearchControllerApiTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private TagRepository tagRepository;

    /** A term no other test data contains. */
    private final String term = "zq" + UUID.randomUUID().toString().substring(0, 6);

    private MockMvc mockMvc;
    private User author;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        author = saveUser(term + "-author", "Author", UserStatus.ACTIVE);
    }

    @Test
    void anonymousCallersFindPublicPostsUsersAndTags() throws Exception {
        savePost("Published " + term, PostStatus.PUBLISHED);
        savePost("Locked " + term, PostStatus.LOCKED);
        savePost("Draft " + term, PostStatus.DRAFT);
        savePost("Deleted " + term, PostStatus.DELETED);
        String fan = saveUser("fan-" + UUID.randomUUID().toString().substring(0, 8),
                "Fan of " + term.toUpperCase(), UserStatus.ACTIVE).getUsername();
        saveUser(term + "-banned", null, UserStatus.BANNED);
        saveTag(term + "-java", 3);
        saveTag(term + "-unused", 0);

        mockMvc.perform(get("/search").param("q", "  " + term + "  "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query").value(term))
                .andExpect(jsonPath("$.posts.content[*].title",
                        containsInAnyOrder("Published " + term, "Locked " + term)))
                .andExpect(jsonPath("$.posts.content[0].slug").exists())
                .andExpect(jsonPath("$.users.content[*].username",
                        containsInAnyOrder(term + "-author", fan)))
                .andExpect(jsonPath("$.users.content[0].email").doesNotExist())
                .andExpect(jsonPath("$.tags.content[*].slug", contains(term + "-java")))
                .andExpect(jsonPath("$.tags.content[0].postCount").value(3));
    }

    @Test
    void theTypeFilterReturnsOneKindAndEachKindIsPagedOnItsOwn() throws Exception {
        for (int i = 1; i <= 3; i++) {
            saveTag(term + "-tag" + i, 10 - i);
        }

        mockMvc.perform(get("/search").param("q", term).param("type", "TAG").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts").value((Object) null))
                .andExpect(jsonPath("$.users").value((Object) null))
                .andExpect(jsonPath("$.tags.content[*].slug", contains(term + "-tag1", term + "-tag2")))
                .andExpect(jsonPath("$.tags.totalElements").value(3))
                .andExpect(jsonPath("$.tags.last").value(false));
        mockMvc.perform(get("/search").param("q", term).param("type", "TAG").param("size", "2").param("page", "1"))
                .andExpect(jsonPath("$.tags.content[*].slug", contains(term + "-tag3")));
    }

    @Test
    void anUnknownTermReturnsEmptyPages() throws Exception {
        mockMvc.perform(get("/search").param("q", term + "-nothing"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts.content", hasSize(0)))
                .andExpect(jsonPath("$.users.content", hasSize(0)))
                .andExpect(jsonPath("$.tags.content", hasSize(0)));
    }

    @Test
    void wildcardsInTheQueryMatchLiterally() throws Exception {
        savePost("Discount 100" + term, PostStatus.PUBLISHED);

        mockMvc.perform(get("/search").param("q", "%" + term.substring(2)).param("type", "POST"))
                .andExpect(jsonPath("$.posts.content", hasSize(0)));
        mockMvc.perform(get("/search").param("q", "100" + term).param("type", "POST"))
                .andExpect(jsonPath("$.posts.content", hasSize(1)));
    }

    @Test
    void invalidQueriesAreRejected() throws Exception {
        mockMvc.perform(get("/search").param("q", " a "))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("The search query must have 2 to 100 characters"));
        mockMvc.perform(get("/search"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/search").param("q", "x".repeat(101)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/search").param("q", term).param("type", "COMMENT"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/search").param("q", term).param("size", "51"))
                .andExpect(status().isBadRequest());
    }

    private void savePost(String title, PostStatus postStatus) {
        postRepository.save(Post.builder()
                .author(author)
                .title(title)
                .slug(title.toLowerCase().replace(' ', '-'))
                .content("Body")
                .status(postStatus)
                .lastActivityAt(OffsetDateTime.now())
                .build());
    }

    private User saveUser(String username, String displayName, UserStatus userStatus) {
        return userRepository.save(User.builder()
                .username(username)
                .email(username + "@example.com")
                .passwordHash("hash")
                .displayName(displayName)
                .role(Role.USER)
                .status(userStatus)
                .build());
    }

    private void saveTag(String slug, int postCount) {
        tagRepository.save(Tag.builder().name(slug).slug(slug).postCount(postCount).build());
    }
}
