package com.devpulse.analytics.repository;

import com.devpulse.analytics.repository.AnalyticsRepository.CategoryPosts;
import com.devpulse.analytics.repository.AnalyticsRepository.PublicDay;
import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Public posts by category on the migrated schema, in a past window no other
 * test writes to, so the dates are fixed. The seeded default categories are
 * listed with 0 posts.
 */
@MigratedSchemaTest
@Transactional
class AnalyticsRepositoryCategoryDistributionTest {

    private static final LocalDate FIRST_DAY = LocalDate.of(2020, 2, 24);
    private static final LocalDate LAST_DAY = LocalDate.of(2020, 3, 1);

    @Autowired private AnalyticsRepository repository;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private long author;

    @BeforeEach
    void setUp() {
        author = jdbc.queryForObject(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, 'hash') RETURNING id",
                Long.class, "share-" + run, "share-" + run + "@example.com");
    }

    @Test
    void anEmptyWindowListsTheVisibleCategoriesAndTheUncategorizedRowWithZero() {
        List<CategoryPosts> rows = repository.publicPostsByCategory(FIRST_DAY, LAST_DAY);

        assertThat(rows).extracting(CategoryPosts::posts).containsOnly(0L);
        assertThat(rows).extracting(CategoryPosts::slug)
                .startsWith("ai", "gaming", "politics", "science", "business", "education", "news")
                .endsWith((String) null);
        assertThat(rows).filteredOn(row -> row.categoryId() == null).hasSize(1);
    }

    @Test
    void rowsAddUpToThePublicActivityOfTheSameWindow() {
        long listed = category("listed", 900, true);
        long hidden = category("hidden", 901, false);
        long hiddenQuiet = category("quiet", 902, false);
        long doomed = category("doomed", 903, true);
        long quietListed = category("empty", 904, true);

        post(listed, "PUBLISHED", "2020-02-24T00:00:00Z");
        post(listed, "LOCKED", "2020-03-01T23:59:59.999999Z");
        post(listed, "DRAFT", "2020-02-26T12:00:00Z");
        post(listed, "DELETED", "2020-02-26T12:00:00Z");
        post(listed, "PUBLISHED", "2020-02-23T23:59:59.999999Z");
        post(listed, "PUBLISHED", "2020-03-02T00:00:00Z");
        post(hidden, "PUBLISHED", "2020-02-27T12:00:00Z");
        post(hiddenQuiet, "PUBLISHED", "2020-02-01T12:00:00Z");
        post(doomed, "PUBLISHED", "2020-02-28T12:00:00Z");
        post(null, "PUBLISHED", "2020-02-29T12:00:00Z");
        jdbc.update("DELETE FROM categories WHERE id = ?", doomed);

        List<CategoryPosts> rows = repository.publicPostsByCategory(FIRST_DAY, LAST_DAY);

        assertThat(rows).filteredOn(row -> row.slug() == null || row.slug().endsWith(run)).containsExactly(
                new CategoryPosts(listed, slug("listed"), "listed " + run, true, 2),
                new CategoryPosts(hidden, slug("hidden"), "hidden " + run, false, 1),
                new CategoryPosts(quietListed, slug("empty"), "empty " + run, true, 0),
                new CategoryPosts(null, null, null, true, 2));
        assertThat(rows).extracting(CategoryPosts::categoryId).doesNotContain(hiddenQuiet, doomed);
        long publicPosts = repository.publicDailyActivity(FIRST_DAY, LAST_DAY).stream()
                .mapToLong(PublicDay::posts).sum();
        assertThat(rows.stream().mapToLong(CategoryPosts::posts).sum()).isEqualTo(publicPosts).isEqualTo(5);
    }

    private long category(String name, int displayOrder, boolean visible) {
        return jdbc.queryForObject("""
                INSERT INTO categories (name, slug, display_order, is_visible) VALUES (?, ?, ?, ?) RETURNING id
                """, Long.class, name + " " + run, slug(name), displayOrder, visible);
    }

    private String slug(String name) {
        return name + "-" + run;
    }

    private void post(Long category, String status, String createdAt) {
        jdbc.update("""
                INSERT INTO posts (user_id, category_id, title, slug, content, status, created_at)
                VALUES (?, ?, 'Title', ?, 'Body', CAST(? AS post_status), ?)
                """, author, category, "share-" + UUID.randomUUID(), status, OffsetDateTime.parse(createdAt));
    }
}
