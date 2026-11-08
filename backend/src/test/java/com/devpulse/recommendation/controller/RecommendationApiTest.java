package com.devpulse.recommendation.controller;

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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The recommendation API through the full security filter chain, against the
 * real schema (PWDRZ-146). Every test first takes the posts and tags of
 * other tests out of the public set, inside its rolled-back transaction, so
 * the expected orders below are exact.
 *
 * <p>Seeded data, created through the forum API in one transaction (so every
 * post has the same creation time and ties fall to the higher id):
 * <ul>
 *   <li>{@code mine}: alice's post, tags java + spring, category A;</li>
 *   <li>{@code liked}: bob's, tag spring, category A, upvoted by alice;</li>
 *   <li>{@code disliked}: bob's, no tags, downvoted by alice;</li>
 *   <li>{@code discussed}: bob's, no tags, no category, commented on by alice;</li>
 *   <li>{@code both}: bob's, tags java + spring + kotlin, category B;</li>
 *   <li>{@code oneTag}: bob's, tag java, category B, 3 recent views;</li>
 *   <li>{@code sameCategory}: bob's, tag go, category A;</li>
 *   <li>{@code busy}: bob's, tag go, category B, 5 recent views;</li>
 *   <li>{@code quiet}: bob's, tag go, category B, 100 views older than the window;</li>
 *   <li>{@code old}: bob's, tag legacy, category B, created 30 days ago;</li>
 *   <li>{@code draft} (draft) and {@code removed} (deleted): bob's, tag java.</li>
 * </ul>
 * Alice's interest posts are {@code mine}, {@code liked} and {@code discussed}:
 * interest tags java and spring, interest category A.
 */
@MigratedSchemaTest
@Transactional
class RecommendationApiTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);
    private final Map<String, Long> ids = new HashMap<>();

    private MockMvc mockMvc;
    private String alice;
    private String bob;
    private Category categoryA;
    private Category categoryB;

    @BeforeEach
    void setUp() throws Exception {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).defaultRequest(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf())).apply(springSecurity()).build();
        jdbc.update("UPDATE posts SET status = 'DELETED' WHERE status IN ('PUBLISHED', 'LOCKED')");
        jdbc.update("UPDATE tags SET post_count = 0");

        alice = saveUser("alice");
        bob = saveUser("bob");
        categoryA = categoryRepository.save(Category.builder().name("A " + run).slug("a-" + run).build());
        categoryB = categoryRepository.save(Category.builder().name("B " + run).slug("b-" + run).build());

        createPost(alice, "mine", categoryA, false, "java", "spring");
        createPost(bob, "liked", categoryA, false, "spring");
        createPost(bob, "disliked", categoryB, false);
        createPost(bob, "discussed", null, false);
        createPost(bob, "both", categoryB, false, "java", "spring", "kotlin");
        createPost(bob, "oneTag", categoryB, false, "java");
        createPost(bob, "sameCategory", categoryA, false, "go");
        createPost(bob, "busy", categoryB, false, "go");
        createPost(bob, "quiet", categoryB, false, "go");
        createPost(bob, "old", categoryB, false, "legacy");
        createPost(bob, "draft", categoryB, true, "java");
        createPost(bob, "removed", categoryB, false, "java");

        vote(alice, "liked", "UP");
        vote(alice, "disliked", "DOWN");
        comment(alice, "discussed");
        views("oneTag", 3, 0);
        views("busy", 5, 0);
        views("quiet", 100, 30);
        jdbc.update("UPDATE posts SET created_at = now() - interval '30 days' WHERE id = ?", ids.get("old"));
        mockMvc.perform(delete("/forum/posts/{slug}", slug("removed")).with(user(bob).roles(Role.USER.name())))
                .andExpect(status().isNoContent());
    }

    // ───────────────────────── posts ─────────────────────────

    @Test
    void anAuthenticatedCallerGetsSimilarTagsThenSameCategoryThenTrending() throws Exception {
        String json = recommendedPosts(as(alice), 100);

        // quiet and old have no recent activity; old is older.
        assertThat(titles(json)).containsExactly("both", "oneTag", "sameCategory", "busy", "quiet", "old");
        assertThat(reasons(json)).containsExactly(
                "similar_tags", "similar_tags", "same_category", "trending", "trending", "trending");
    }

    @Test
    void anonymousCallersGetTheTrendingOrder() throws Exception {
        // Activity: busy 5; oneTag and discussed 3 (the higher id first); liked and disliked 2 (one vote each,
        // vote score 1 before -1); the rest 0, newest first, then the higher id.
        String json = recommendedPosts(get("/recommendations/posts"), 100);

        assertThat(titles(json)).containsExactly(
                "busy", "oneTag", "discussed", "liked", "disliked", "quiet", "sameCategory", "both", "mine", "old");
        assertThat(reasons(json)).containsOnly("trending");
    }

    @Test
    void aCallerWithoutActivityGetsTheAnonymousOrder() throws Exception {
        String carol = saveUser("carol");

        assertThat(titles(recommendedPosts(as(carol), 100)))
                .isEqualTo(titles(recommendedPosts(get("/recommendations/posts"), 100)));
    }

    @Test
    void draftsAndDeletedPostsAreNeverRecommended() throws Exception {
        assertThat(titles(recommendedPosts(get("/recommendations/posts"), 100))).doesNotContain("draft", "removed");
        assertThat(titles(recommendedPosts(as(alice), 100))).doesNotContain("draft", "removed");
    }

    @Test
    void postsTheCallerWroteVotedOnOrCommentedOnAreLeftOut() throws Exception {
        assertThat(titles(recommendedPosts(as(alice), 100)))
                .doesNotContain("mine", "liked", "disliked", "discussed");
    }

    @Test
    void repeatedRequestsGiveTheSameOrderAndThePayloadIsTheDocumentedOne() throws Exception {
        String first = recommendedPosts(as(alice), 100);
        assertThat(recommendedPosts(as(alice), 100)).isEqualTo(first);

        mockMvc.perform(get("/recommendations/posts").with(as(alice)).param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("both " + run))
                .andExpect(jsonPath("$[0].slug").value(slug("both")))
                .andExpect(jsonPath("$[0].excerpt").value("Body of both"))
                .andExpect(jsonPath("$[0].voteScore").value(0))
                .andExpect(jsonPath("$[0].commentCount").value(0))
                .andExpect(jsonPath("$[0].category.slug").value(categoryB.getSlug()))
                .andExpect(jsonPath("$[0].author.username").value(bob))
                .andExpect(jsonPath("$[0].author.email").doesNotExist())
                .andExpect(jsonPath("$[0].tags").value(contains(
                        tag("java"), tag("kotlin"), tag("spring"))))
                .andExpect(jsonPath("$[0].reason").value("similar_tags"))
                .andExpect(jsonPath("$[0].createdAt").exists())
                .andExpect(jsonPath("$[0].content").doesNotExist());
    }

    @Test
    void aCommentMakesThePostAnInterest() throws Exception {
        String dave = saveUser("dave");
        comment(dave, "sameCategory");

        String json = recommendedPosts(as(dave), 3);
        // sameCategory has tag go and category A: busy and quiet share go, liked (activity 2) and mine are in A.
        assertThat(titles(json)).containsExactly("busy", "quiet", "liked");
        assertThat(reasons(json)).containsExactly("similar_tags", "similar_tags", "same_category");
    }

    @Test
    void theLimitIsCheckedAndApplied() throws Exception {
        for (String limit : List.of("0", "101", "-1")) {
            mockMvc.perform(get("/recommendations/posts").param("limit", limit))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail").value("limit must be between 1 and 100"));
            mockMvc.perform(get("/recommendations/tags").param("limit", limit))
                    .andExpect(status().isBadRequest());
        }
        assertThat(titles(recommendedPosts(get("/recommendations/posts"), 2))).containsExactly("busy", "oneTag");
        mockMvc.perform(get("/recommendations/posts")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(10));
    }

    @Test
    void theListsAreEmptyWhenNothingIsPublic() throws Exception {
        jdbc.update("UPDATE posts SET status = 'DELETED'");
        jdbc.update("UPDATE tags SET post_count = 0");

        mockMvc.perform(get("/recommendations/posts").with(as(alice)))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        mockMvc.perform(get("/recommendations/tags"))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
    }

    // ───────────────────────── tags ─────────────────────────

    @Test
    void anonymousCallersGetTagsByRecentPostsThenPostCountThenName() throws Exception {
        // go, java and spring are each on three recent public posts, kotlin on one, legacy only on an old one.
        assertThat(tagNames(get("/recommendations/tags")))
                .containsExactly(tag("go"), tag("java"), tag("spring"), tag("kotlin"), tag("legacy"));
    }

    @Test
    void anAuthenticatedCallerGetsTagsRelatedToTheirInterestsWithoutThem() throws Exception {
        // kotlin shares a post with java and spring; go and legacy share none; java and spring are interests.
        assertThat(tagNames(get("/recommendations/tags").with(as(alice))))
                .containsExactly(tag("kotlin"), tag("go"), tag("legacy"));
    }

    @Test
    void recommendedTagsHaveTheTagListFields() throws Exception {
        mockMvc.perform(get("/recommendations/tags").param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value(tag("go")))
                .andExpect(jsonPath("$[0].slug").value(tag("go")))
                .andExpect(jsonPath("$[0].postCount").value(3))
                .andExpect(jsonPath("$[0].id").isNumber());
    }

    private static RequestPostProcessor as(String username) {
        return user(username).roles(Role.USER.name());
    }

    private String recommendedPosts(RequestPostProcessor caller, int limit) throws Exception {
        return recommendedPosts(get("/recommendations/posts").with(caller), limit);
    }

    private String recommendedPosts(MockHttpServletRequestBuilder request, int limit) throws Exception {
        return mockMvc.perform(request.param("limit", String.valueOf(limit)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private List<String> titles(String json) {
        List<String> titles = JsonPath.read(json, "$[*].title");
        return titles.stream().map(t -> t.substring(0, t.indexOf(' '))).toList();
    }

    private static List<String> reasons(String json) {
        return JsonPath.read(json, "$[*].reason");
    }

    private List<String> tagNames(MockHttpServletRequestBuilder request) throws Exception {
        String json = mockMvc.perform(request.param("limit", "100"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$[*].name");
    }

    private String tag(String name) {
        return name + "-" + run;
    }

    private String slug(String key) {
        return jdbc.queryForObject("SELECT slug FROM posts WHERE id = ?", String.class, ids.get(key));
    }

    private void createPost(String author, String key, Category category, boolean draft, String... tags)
            throws Exception {
        String tagList = Arrays.stream(tags).map(t -> "\"" + tag(t) + "\"").collect(Collectors.joining(", "));
        Long categoryId = category == null ? categoryA.getId() : category.getId();
        String json = mockMvc.perform(post("/forum/posts").with(as(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title": "%s %s", "content": "  Body\\n of   %s ", "categoryId": %d,
                                 "tags": [%s], "draft": %s}
                                """.formatted(key, run, key, categoryId, tagList, draft)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Integer id = JsonPath.read(json, "$.id");
        ids.put(key, id.longValue());
        if (category == null) {
            jdbc.update("UPDATE posts SET category_id = NULL WHERE id = ?", id);
        }
    }

    private void vote(String voter, String key, String type) throws Exception {
        mockMvc.perform(post("/forum/votes").with(as(voter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"entityType\": \"POST\", \"entityId\": %d, \"voteType\": \"%s\"}"
                                .formatted(ids.get(key), type)))
                .andExpect(status().isCreated());
    }

    private void comment(String author, String key) throws Exception {
        mockMvc.perform(post("/forum/posts/{slug}/comments", slug(key)).with(as(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"A comment\"}"))
                .andExpect(status().isCreated());
    }

    /** Records {@code count} anonymous views of the post, {@code daysAgo} days in the past. */
    private void views(String key, int count, int daysAgo) {
        jdbc.update("""
                INSERT INTO activity_events (event_type, entity_type, entity_id, created_at)
                SELECT 'POST_VIEWED', 'POST', ?, now() - make_interval(days => ?) FROM generate_series(1, ?)
                """, ids.get(key), daysAgo, count);
    }

    private String saveUser(String name) {
        String username = name + "-" + run;
        userRepository.save(User.builder()
                .username(username)
                .email(username + "@example.com")
                .passwordHash("hash")
                .role(Role.USER)
                .build());
        return username;
    }
}
