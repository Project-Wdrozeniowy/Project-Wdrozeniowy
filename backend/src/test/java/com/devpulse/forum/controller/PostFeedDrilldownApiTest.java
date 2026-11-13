package com.devpulse.forum.controller;

import com.devpulse.analytics.repository.AnalyticsRepository;
import com.devpulse.analytics.repository.AnalyticsRepository.CategoryPosts;
import com.devpulse.analytics.repository.AnalyticsRepository.PublicDay;
import com.devpulse.support.MigratedSchemaTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The feed as the drill-down of the public analytics, against the real schema:
 * creation bounds and the uncategorized filter list exactly the posts behind
 * an activity day or a category row. Fixtures sit in a past window no other
 * test writes to, so the dates are fixed and the aggregates are exact.
 */
@MigratedSchemaTest
@Transactional
class PostFeedDrilldownApiTest {

    private static final LocalDate DAY = LocalDate.of(2020, 2, 29);
    private static final String DAY_START = "2020-02-29T00:00:00Z";
    private static final String NEXT_DAY_START = "2020-03-01T00:00:00Z";
    private static final String WINDOW_START = "2020-02-24T00:00:00Z";
    private static final String WINDOW_END = "2020-03-02T00:00:00Z";

    @Autowired private WebApplicationContext context;
    @Autowired private AnalyticsRepository analytics;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;
    private long author;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        author = jdbc.queryForObject(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, 'hash') RETURNING id",
                Long.class, "drill-" + run, "drill-" + run + "@example.com");
    }

    @Test
    void aDayListsThePostsOfItsActivityRowWithBothUtcEdges() throws Exception {
        post("before", null, "PUBLISHED", "2020-02-28T23:59:59.999999Z");
        String first = post("first", null, "PUBLISHED", DAY_START);
        String offset = post("offset", null, "LOCKED", "2020-02-29T12:00:00+02:00");
        String last = post("last", null, "PUBLISHED", "2020-02-29T23:59:59.999999Z");
        post("after", null, "PUBLISHED", NEXT_DAY_START);
        post("draft", null, "DRAFT", "2020-02-29T08:00:00Z");
        post("deleted", null, "DELETED", "2020-02-29T08:00:00Z");

        feed(DAY_START, NEXT_DAY_START)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[*].slug", containsInAnyOrder(first, offset, last)));

        assertThat(analytics.publicDailyActivity(DAY, DAY)).containsExactly(new PublicDay(DAY, 3, 0));
    }

    @Test
    void categoryRowsOfAWindowListTheirPostsIncludingUncategorizedAndQuietOnes() throws Exception {
        long listed = category("listed", true);
        long hidden = category("hidden", false);
        long quiet = category("quiet", true);
        long doomed = category("doomed", true);
        String a = post("a", listed, "PUBLISHED", "2020-02-24T00:00:00Z");
        String b = post("b", listed, "LOCKED", "2020-03-01T23:59:59.999999Z");
        post("outside", listed, "PUBLISHED", WINDOW_END);
        post("listed-draft", listed, "DRAFT", "2020-02-26T00:00:00Z");
        String c = post("c", hidden, "PUBLISHED", "2020-02-27T00:00:00Z");
        String loose = post("loose", null, "PUBLISHED", "2020-02-28T00:00:00Z");
        String orphan = post("orphan", doomed, "PUBLISHED", "2020-02-28T00:00:00Z");
        jdbc.update("DELETE FROM categories WHERE id = ?", doomed);

        List<CategoryPosts> rows = analytics.publicPostsByCategory(LocalDate.of(2020, 2, 24), LocalDate.of(2020, 3, 1));
        assertThat(postsOf(rows, listed)).isEqualTo(2);
        assertThat(postsOf(rows, hidden)).isEqualTo(1);
        assertThat(postsOf(rows, quiet)).isZero();
        assertThat(postsOf(rows, null)).isEqualTo(2);

        feed(WINDOW_START, WINDOW_END, "categoryId", String.valueOf(listed))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[*].slug", containsInAnyOrder(a, b)));
        feed(WINDOW_START, WINDOW_END, "categoryId", String.valueOf(hidden))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].slug").value(c))
                .andExpect(jsonPath("$.content[0].category.visible").value(false));
        feed(WINDOW_START, WINDOW_END, "categoryId", String.valueOf(quiet))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.content").isEmpty());
        feed(WINDOW_START, WINDOW_END, "uncategorized", "true")
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[*].slug", containsInAnyOrder(loose, orphan)))
                .andExpect(jsonPath("$.content[0].category").value((Object) null));
    }

    @Test
    void pagesOfAWindowAreStableAndOtherFiltersStillApply() throws Exception {
        List<String> expected = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            expected.add(0, post("paged-" + i, null, "PUBLISHED", "2020-02-2" + (4 + i) + "T12:00:00Z"));
        }
        jdbc.update("INSERT INTO tags (name, slug) VALUES (?, ?)", "drill-" + run, "drill-" + run);
        jdbc.update("INSERT INTO post_tags (post_id, tag_id) SELECT p.id, t.id FROM posts p, tags t "
                + "WHERE p.slug = ? AND t.slug = ?", expected.get(1), "drill-" + run);

        List<String> listed = new ArrayList<>();
        for (int page = 0; page < 3; page++) {
            String body = mockMvc.perform(get("/forum/posts")
                            .param("createdFrom", WINDOW_START).param("createdTo", WINDOW_END)
                            .param("sort", "createdAt").param("size", "2").param("page", String.valueOf(page)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(5))
                    .andExpect(jsonPath("$.totalPages").value(3))
                    .andReturn().getResponse().getContentAsString();
            listed.addAll(JsonPath.<List<String>>read(body, "$.content[*].slug"));
        }
        assertThat(listed).containsExactlyElementsOf(expected);
        assertThat(new HashSet<>(listed)).hasSize(5);

        feed(WINDOW_START, WINDOW_END, "tag", "drill-" + run)
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].slug").value(expected.get(1)));
        mockMvc.perform(get("/forum/posts").param("author", "drill-" + run).param("createdFrom", "2020-02-26T12:00:00Z"))
                .andExpect(jsonPath("$.totalElements").value(3));
        mockMvc.perform(get("/forum/posts").param("author", "drill-" + run).param("createdTo", "2020-02-26T12:00:00Z"))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void invalidRangesAndConflictingCategoryFiltersAreRejected() throws Exception {
        mockMvc.perform(get("/forum/posts").param("createdFrom", DAY_START).param("createdTo", DAY_START))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("createdFrom must be before createdTo"));
        mockMvc.perform(get("/forum/posts").param("createdFrom", NEXT_DAY_START).param("createdTo", DAY_START))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("createdFrom must be before createdTo"));
        for (String invalid : List.of("2020-02-30T00:00:00Z", "yesterday", "2020-02-29")) {
            mockMvc.perform(get("/forum/posts").param("createdFrom", invalid))
                    .andExpect(status().isBadRequest());
        }
        mockMvc.perform(get("/forum/posts").param("uncategorized", "true").param("categoryId", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("uncategorized cannot be combined with categoryId or categorySlug"));
        mockMvc.perform(get("/forum/posts").param("uncategorized", "true").param("categorySlug", "ai"))
                .andExpect(status().isBadRequest());
    }

    private ResultActions feed(String from, String to, String... params) throws Exception {
        var request = get("/forum/posts").param("createdFrom", from).param("createdTo", to).param("size", "50");
        for (int i = 0; i < params.length; i += 2) {
            request.param(params[i], params[i + 1]);
        }
        return mockMvc.perform(request).andExpect(status().isOk());
    }

    private static long postsOf(List<CategoryPosts> rows, Long categoryId) {
        return rows.stream().filter(row -> java.util.Objects.equals(row.categoryId(), categoryId))
                .mapToLong(CategoryPosts::posts).sum();
    }

    private long category(String name, boolean visible) {
        return jdbc.queryForObject("""
                INSERT INTO categories (name, slug, display_order, is_visible) VALUES (?, ?, 900, ?) RETURNING id
                """, Long.class, name + " " + run, name + "-" + run, visible);
    }

    private String post(String name, Long category, String status, String createdAt) {
        String slug = name + "-" + run;
        jdbc.update("""
                INSERT INTO posts (user_id, category_id, title, slug, content, status, created_at)
                VALUES (?, ?, ?, ?, 'Body', CAST(? AS post_status), ?)
                """, author, category, name, slug, status, OffsetDateTime.parse(createdAt));
        return slug;
    }
}
