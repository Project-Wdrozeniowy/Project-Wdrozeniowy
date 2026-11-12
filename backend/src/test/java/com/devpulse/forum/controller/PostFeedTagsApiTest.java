package com.devpulse.forum.controller;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.repository.PostRepository;
import com.devpulse.support.MigratedSchemaTest;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tags in the paginated feed ({@code GET /forum/posts}) against the real
 * schema: what each card carries, that paging and filters are unchanged, that
 * a page needs one tag query whatever its size, and that listing counts no
 * opening.
 */
@MigratedSchemaTest
@Transactional
class PostFeedTagsApiTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private EntityManager entityManager;
    @Autowired private EntityManagerFactory entityManagerFactory;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;
    private User author;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        author = userRepository.save(User.builder()
                .username("tagger-" + run)
                .email("tagger-" + run + "@example.com")
                .passwordHash("hash")
                .role(Role.USER)
                .build());
    }

    @Test
    void cardsCarryTheirTagsSortedBySlugAndAnUntaggedPostAnEmptyList() throws Exception {
        Post tagged = savePost("tagged", 3);
        tag(tagged, "zeta", "alpha", "mid");
        Post untagged = savePost("untagged", 2);
        Post single = savePost("single", 1);
        tag(single, "alpha");
        entityManager.clear();

        mockMvc.perform(get("/forum/posts").param("author", author.getUsername()).param("sort", "createdAt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[0].slug").value(single.getSlug()))
                .andExpect(jsonPath("$.content[0].tags[*].slug", contains(slug("alpha"))))
                .andExpect(jsonPath("$.content[1].slug").value(untagged.getSlug()))
                .andExpect(jsonPath("$.content[1].tags", empty()))
                .andExpect(jsonPath("$.content[2].slug").value(tagged.getSlug()))
                .andExpect(jsonPath("$.content[2].tags[*].slug",
                        contains(slug("alpha"), slug("mid"), slug("zeta"))))
                .andExpect(jsonPath("$.content[2].tags[0].name").value(slug("alpha")))
                .andExpect(jsonPath("$.content[2].tags[0].id").isNumber())
                .andExpect(jsonPath("$.content[2].tags[0].postCount").isNumber());
    }

    @Test
    void filteringByATagListsEveryTagOfThePostAndPagesStayStable() throws Exception {
        List<String> expected = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            Post post = savePost("filtered-" + i, 10 - i);
            tag(post, "shared", "own-" + i);
            expected.add(0, post.getSlug());
        }
        tag(savePost("other", 1), "own-0");
        entityManager.clear();

        List<String> listed = new ArrayList<>();
        for (int page = 0; page < 3; page++) {
            String body = mockMvc.perform(get("/forum/posts")
                            .param("tag", slug("shared")).param("sort", "createdAt")
                            .param("size", "2").param("page", String.valueOf(page)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(5))
                    .andExpect(jsonPath("$.totalPages").value(3))
                    .andReturn().getResponse().getContentAsString();
            listed.addAll(JsonPath.<List<String>>read(body, "$.content[*].slug"));
            List<Integer> tagsPerPost = JsonPath.read(body, "$.content[*].tags.length()");
            assertThat(tagsPerPost).containsOnly(2);
        }

        assertThat(listed).containsExactlyElementsOf(expected);
    }

    @Test
    void aPageNeedsOneTagQueryWhateverItsSize() throws Exception {
        for (int i = 0; i < 6; i++) {
            tag(savePost("counted-" + i, 10 - i), "first-" + i, "second-" + i);
        }
        entityManager.flush();

        long small = statementsFor("1");
        long large = statementsFor("6");

        assertThat(large).isEqualTo(small);
    }

    @Test
    void listingTheFeedCountsNoOpening() throws Exception {
        Post post = savePost("listed", 1);
        tag(post, "listed");
        entityManager.clear();

        mockMvc.perform(get("/forum/posts").param("author", author.getUsername())).andExpect(status().isOk());
        mockMvc.perform(get("/forum/posts").param("tag", slug("listed"))).andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT view_count FROM posts WHERE id = ?", Integer.class, post.getId()))
                .isZero();
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM activity_events WHERE event_type = 'POST_VIEWED' AND entity_id = ?",
                Integer.class, post.getId())).isZero();
    }

    /** Statements Hibernate prepares to list this author's posts in pages of {@code size}. */
    private long statementsFor(String size) throws Exception {
        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        entityManager.clear();
        statistics.setStatisticsEnabled(true);
        statistics.clear();
        try {
            mockMvc.perform(get("/forum/posts").param("author", author.getUsername()).param("size", size))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].tags.length()").value(2));
            return statistics.getPrepareStatementCount();
        } finally {
            statistics.setStatisticsEnabled(false);
        }
    }

    private String slug(String name) {
        return name + "-" + run;
    }

    /** Attaches tags named {@code name-run}, creating them when missing. */
    private void tag(Post post, String... names) {
        for (String name : names) {
            jdbc.update("INSERT INTO tags (name, slug, post_count) VALUES (?, ?, 1) ON CONFLICT (slug) DO NOTHING",
                    slug(name), slug(name));
            jdbc.update("INSERT INTO post_tags (post_id, tag_id) SELECT ?, id FROM tags WHERE slug = ?",
                    post.getId(), slug(name));
        }
    }

    private Post savePost(String name, int hoursAgo) {
        Post post = postRepository.saveAndFlush(Post.builder()
                .author(author)
                .title(name)
                .slug(name + "-" + run)
                .content("Body")
                .status(PostStatus.PUBLISHED)
                .lastActivityAt(OffsetDateTime.now())
                .build());
        jdbc.update("UPDATE posts SET created_at = now() - make_interval(hours => ?) WHERE id = ?", hoursAgo, post.getId());
        return post;
    }
}
