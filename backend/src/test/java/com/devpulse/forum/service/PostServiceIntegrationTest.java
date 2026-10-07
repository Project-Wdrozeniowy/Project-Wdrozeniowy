package com.devpulse.forum.service;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.CreatePostRequest;
import com.devpulse.forum.dto.PostDto;
import com.devpulse.forum.dto.PostSummaryDto;
import com.devpulse.forum.dto.TagDto;
import com.devpulse.forum.dto.UpdatePostRequest;
import com.devpulse.forum.entity.Category;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.repository.CategoryRepository;
import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@link PostService} against the real PostgreSQL schema: native enums, the
 * {@code post_tags} join table, the counter updates and the security rules.
 * Each test runs in a transaction that is rolled back afterwards.
 */
@MigratedSchemaTest
@Transactional
class PostServiceIntegrationTest {

    @Autowired private PostService postService;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private User alice;
    private User bob;
    private User moderator;
    private User admin;
    private Category category;

    @BeforeEach
    void setUp() {
        alice = user("alice", Role.USER);
        bob = user("bob", Role.USER);
        moderator = user("mod", Role.MODERATOR);
        admin = user("admin", Role.ADMIN);
        category = categoryRepository.save(Category.builder()
                .name("General " + run)
                .slug("general-" + run)
                .build());
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    // ───────────────────────── create / read ─────────────────────────

    @Test
    void createReturnsTheContractShapeAndCountsThePost() {
        as(alice);
        PostDto post = postService.create(create("Hello World", "Spring", "postgres-" + run, "spring"));

        assertThat(post.getSlug()).isEqualTo("hello-world" + slugSuffix(post));
        assertThat(post.getStatus()).isEqualTo("PUBLISHED");
        assertThat(post.isPinned()).isFalse();
        assertThat(post.getAuthor().getUsername()).isEqualTo(alice.getUsername());
        assertThat(post.getAuthor().getRole()).isEqualTo("USER");
        assertThat(post.getCategory().getSlug()).isEqualTo(category.getSlug());
        // Names are stored lower-case, duplicates collapse, every tag counts this post.
        assertThat(post.getTags()).extracting(TagDto::getName)
                .containsExactly("postgres-" + run, "spring");
        assertThat(post.getTags()).allSatisfy(tag -> assertThat(tag.getPostCount()).isPositive());
        assertThat(tagCount("postgres-" + run)).isEqualTo(1);
        assertThat(userPostCount(alice)).isEqualTo(1);
    }

    @Test
    void secondPostWithTheSameTitleGetsASuffixedSlugAndReusesTags() {
        as(alice);
        String tag = "shared-" + run;
        PostDto first = postService.create(create("Same title " + run, tag));
        PostDto second = postService.create(create("Same title " + run, tag));

        assertThat(second.getSlug()).isEqualTo(first.getSlug() + "-2");
        assertThat(second.getTags()).singleElement()
                .satisfies(t -> assertThat(t.getId()).isEqualTo(first.getTags().get(0).getId()));
        assertThat(tagCount(tag)).isEqualTo(2);
    }

    @Test
    void createRejectsAnUnknownCategory() {
        as(alice);
        CreatePostRequest request = create("No category");
        request.setCategoryId(-1L);

        assertStatus(() -> postService.create(request), HttpStatus.BAD_REQUEST);
    }

    @Test
    void draftIsVisibleToItsAuthorAndAdminsOnlyAndIsNotCounted() {
        as(alice);
        CreatePostRequest request = create("Draft " + run, "draft-" + run);
        request.setDraft(true);
        String slug = postService.create(request).getSlug();

        assertThat(postService.getBySlug(slug).getStatus()).isEqualTo("DRAFT");
        assertThat(tagCount("draft-" + run)).isZero();
        assertThat(userPostCount(alice)).isZero();

        as(admin);
        assertThat(postService.getBySlug(slug).getSlug()).isEqualTo(slug);
        as(moderator);
        assertStatus(() -> postService.getBySlug(slug), HttpStatus.NOT_FOUND);
        as(bob);
        assertStatus(() -> postService.getBySlug(slug), HttpStatus.NOT_FOUND);
        SecurityContextHolder.clearContext();
        assertStatus(() -> postService.getBySlug(slug), HttpStatus.NOT_FOUND);
    }

    // ───────────────────────── update ─────────────────────────

    @Test
    void updateReplacesTagsAndMovesTheirCounters() {
        as(alice);
        String a = "a-" + run;
        String b = "b-" + run;
        String c = "c-" + run;
        String slug = postService.create(create("Tags " + run, a, b)).getSlug();

        UpdatePostRequest request = new UpdatePostRequest();
        request.setTags(List.of(b, c));
        request.setTitle("Tags renamed");
        PostDto updated = postService.update(slug, request);

        assertThat(updated.getTitle()).isEqualTo("Tags renamed");
        assertThat(updated.getSlug()).isEqualTo(slug);
        assertThat(updated.getTags()).extracting(TagDto::getName).containsExactly(b, c);
        assertThat(tagCount(a)).isZero();
        assertThat(tagCount(b)).isEqualTo(1);
        assertThat(tagCount(c)).isEqualTo(1);
    }

    @Test
    void publishingAndUnpublishingMovesTheCounters() {
        as(alice);
        String tag = "status-" + run;
        String slug = postService.create(create("Status " + run, tag)).getSlug();

        postService.update(slug, status("DRAFT"));
        assertThat(tagCount(tag)).isZero();
        assertThat(userPostCount(alice)).isZero();

        postService.update(slug, status("PUBLISHED"));
        assertThat(tagCount(tag)).isEqualTo(1);
        assertThat(userPostCount(alice)).isEqualTo(1);
    }

    @Test
    void onlyTheAuthorAndStaffMayEdit() {
        as(alice);
        String slug = postService.create(create("Owned " + run)).getSlug();

        as(bob);
        assertThatThrownBy(() -> postService.update(slug, status("DRAFT")))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> postService.delete(slug))
                .isInstanceOf(AccessDeniedException.class);

        as(moderator);
        UpdatePostRequest edit = new UpdatePostRequest();
        edit.setContent("Moderated");
        assertThat(postService.update(slug, edit).getContent()).isEqualTo("Moderated");
    }

    @Test
    void lockedPostIsReadOnlyForEveryoneButStaff() {
        as(alice);
        String slug = postService.create(create("Lock me " + run)).getSlug();
        assertStatus(() -> postService.update(slug, status("LOCKED")), HttpStatus.FORBIDDEN);

        as(moderator);
        assertThat(postService.update(slug, status("LOCKED")).getStatus()).isEqualTo("LOCKED");
        // Locked posts are still public and counted.
        assertThat(userPostCount(alice)).isEqualTo(1);

        as(alice);
        UpdatePostRequest edit = new UpdatePostRequest();
        edit.setContent("Sneaky edit");
        assertStatus(() -> postService.update(slug, edit), HttpStatus.FORBIDDEN);
        assertStatus(() -> postService.delete(slug), HttpStatus.FORBIDDEN);

        as(moderator);
        assertThat(postService.update(slug, status("PUBLISHED")).getStatus()).isEqualTo("PUBLISHED");
    }

    // ───────────────────────── delete / pin ─────────────────────────

    @Test
    void deleteHidesThePostAndUncountsIt() {
        as(alice);
        String tag = "gone-" + run;
        String slug = postService.create(create("Delete me " + run, tag)).getSlug();

        postService.delete(slug);

        assertStatus(() -> postService.getBySlug(slug), HttpStatus.NOT_FOUND);
        assertStatus(() -> postService.delete(slug), HttpStatus.NOT_FOUND);
        assertThat(tagCount(tag)).isZero();
        assertThat(userPostCount(alice)).isZero();
    }

    @Test
    void onlyStaffMayPin() {
        as(alice);
        String slug = postService.create(create("Pin me " + run)).getSlug();
        assertThatThrownBy(() -> postService.togglePin(slug)).isInstanceOf(AccessDeniedException.class);

        as(moderator);
        assertThat(postService.togglePin(slug).isPinned()).isTrue();
        assertThat(postService.togglePin(slug).isPinned()).isFalse();
    }

    // ───────────────────────── search ─────────────────────────

    @Test
    void listingShowsPublicPostsAndHonoursStatusOnlyForThoseWhoMaySeeIt() {
        as(alice);
        String published = postService.create(create("Visible " + run)).getSlug();
        String locked = postService.create(create("Locked " + run)).getSlug();
        CreatePostRequest draftRequest = create("Draft " + run);
        draftRequest.setDraft(true);
        String draft = postService.create(draftRequest).getSlug();
        String deleted = postService.create(create("Deleted " + run)).getSlug();
        postService.delete(deleted);
        as(moderator);
        postService.update(locked, status("LOCKED"));

        SecurityContextHolder.clearContext();
        assertThat(slugs(filter(null, null))).containsExactlyInAnyOrder(published, locked);
        assertThat(slugs(filter(PostStatus.DELETED, null))).containsExactlyInAnyOrder(published, locked);

        as(moderator);
        assertThat(slugs(filter(PostStatus.DELETED, null))).containsExactly(deleted);
        assertThat(slugs(filter(PostStatus.DRAFT, null))).containsExactlyInAnyOrder(published, locked);

        as(alice);
        assertThat(slugs(filter(PostStatus.DRAFT, alice.getUsername()))).containsExactly(draft);
        as(admin);
        assertThat(slugs(filter(PostStatus.DRAFT, null))).contains(draft);
    }

    @Test
    void searchFiltersByTagAndTreatsLikeWildcardsLiterally() {
        as(alice);
        String tag = "filter-" + run;
        String tagged = postService.create(create("Tagged " + run, tag)).getSlug();
        String percent = postService.create(create("Discount 100% " + run)).getSlug();
        postService.create(create("Discount 1000 " + run));

        assertThat(slugs(new PostFilter(null, null, null, tag, null, null))).containsExactly(tagged);
        assertThat(slugs(new PostFilter("100% " + run, null, null, null, null, null))).containsExactly(percent);
    }

    // ───────────────────────── helpers ─────────────────────────

    private User user(String name, Role role) {
        String username = name + "-" + run;
        return userRepository.save(User.builder()
                .username(username)
                .email(username + "@example.com")
                .passwordHash("hash")
                .role(role)
                .build());
    }

    private static void as(User user) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                user.getUsername(), null, AuthorityUtils.createAuthorityList("ROLE_" + user.getRole().name())));
    }

    private CreatePostRequest create(String title, String... tags) {
        CreatePostRequest request = new CreatePostRequest();
        request.setTitle(title);
        request.setContent("Content of " + title);
        request.setCategoryId(category.getId());
        request.setTags(List.of(tags));
        return request;
    }

    private static UpdatePostRequest status(String status) {
        UpdatePostRequest request = new UpdatePostRequest();
        request.setStatus(status);
        return request;
    }

    /** Restricts the listing to this test's category, so posts from other tests don't interfere. */
    private PostFilter filter(PostStatus status, String author) {
        return new PostFilter(null, category.getId(), null, null, author, status);
    }

    private List<String> slugs(PostFilter filter) {
        return postService.search(filter, PageRequest.of(0, 50, Sort.by(Sort.Order.desc("id"))))
                .map(PostSummaryDto::getSlug)
                .getContent();
    }

    /** The "Hello World" slug may already be taken by an earlier run, so tolerate a suffix. */
    private static String slugSuffix(PostDto post) {
        return post.getSlug().substring("hello-world".length());
    }

    private int tagCount(String slug) {
        return jdbcTemplate.queryForObject("SELECT post_count FROM tags WHERE slug = ?", Integer.class, slug);
    }

    private int userPostCount(User user) {
        return jdbcTemplate.queryForObject("SELECT post_count FROM users WHERE id = ?", Integer.class, user.getId());
    }

    private static void assertStatus(Runnable call, HttpStatus status) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(AppException.class, e -> assertThat(e.getStatus()).isEqualTo(status));
    }
}
