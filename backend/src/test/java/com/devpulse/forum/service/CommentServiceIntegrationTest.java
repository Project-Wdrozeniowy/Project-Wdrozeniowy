package com.devpulse.forum.service;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.common.dto.PagedResponse;
import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.CommentDto;
import com.devpulse.forum.dto.CreateCommentRequest;
import com.devpulse.forum.dto.UpdateCommentRequest;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.repository.PostRepository;
import com.devpulse.support.MigratedSchemaTest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@link CommentService} against the real PostgreSQL schema: the native
 * {@code comment_status} enum, the depth constraint, the reply-tree queries and
 * the atomic {@code comment_count} updates. Each test is rolled back afterwards.
 */
@MigratedSchemaTest
@Transactional
class CommentServiceIntegrationTest {

    @Autowired private CommentService commentService;
    @Autowired private UserRepository userRepository;
    @Autowired private PostRepository postRepository;
    @PersistenceContext private EntityManager entityManager;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private User alice;
    private User bob;
    private User moderator;
    private Post post;

    @BeforeEach
    void setUp() {
        alice = user("alice", Role.USER);
        bob = user("bob", Role.USER);
        moderator = user("mod", Role.MODERATOR);
        post = postRepository.save(Post.builder()
                .author(alice)
                .title("Post " + run)
                .slug("post-" + run)
                .content("content")
                .build());
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void repliesFormATreeAndCountersFollow() {
        as(bob);
        CommentDto root = commentService.createComment(post.getSlug(), request("root", null));
        CommentDto reply = commentService.createComment(post.getSlug(), request("reply", root.getId()));
        commentService.createComment(post.getSlug(), request("grandchild", reply.getId()));
        as(alice);
        commentService.createComment(post.getSlug(), request("second root", null));

        PagedResponse<CommentDto> page = commentService.listComments(post.getSlug(), 0, 20);

        assertThat(page.getTotalElements()).isEqualTo(2);
        CommentDto first = page.getContent().get(0);
        assertThat(first.getContent()).isEqualTo("root");
        assertThat(first.getAuthor().getUsername()).isEqualTo(bob.getUsername());
        assertThat(first.getReplies()).singleElement().satisfies(r -> {
            assertThat(r.getContent()).isEqualTo("reply");
            assertThat(r.getDepth()).isEqualTo(1);
            assertThat(r.getReplies()).singleElement()
                    .satisfies(g -> assertThat(g.getDepth()).isEqualTo(2));
        });
        assertThat(commentCount()).isEqualTo(4);
    }

    @Test
    void rootsArePaged() {
        as(alice);
        for (int i = 0; i < 3; i++) {
            commentService.createComment(post.getSlug(), request("c" + i, null));
        }

        PagedResponse<CommentDto> firstPage = commentService.listComments(post.getSlug(), 0, 2);
        PagedResponse<CommentDto> secondPage = commentService.listComments(post.getSlug(), 1, 2);

        assertThat(firstPage.getContent()).hasSize(2);
        assertThat(firstPage.isLast()).isFalse();
        assertThat(secondPage.getContent()).singleElement()
                .satisfies(c -> assertThat(c.getContent()).isEqualTo("c2"));
        assertThat(secondPage.isLast()).isTrue();
    }

    @Test
    void depthLimitIsEnforcedBeforeTheDatabaseConstraint() {
        as(alice);
        CommentDto parent = commentService.createComment(post.getSlug(), request("level 0", null));
        for (int level = 1; level <= 5; level++) {
            parent = commentService.createComment(post.getSlug(), request("level " + level, parent.getId()));
        }
        assertThat(parent.getDepth()).isEqualTo(5);

        Long deepest = parent.getId();
        assertStatus(() -> commentService.createComment(post.getSlug(), request("too deep", deepest)),
                HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Test
    void deletedCommentStaysAsAPlaceholderAndTheCounterDrops() {
        as(bob);
        CommentDto root = commentService.createComment(post.getSlug(), request("secret", null));
        commentService.createComment(post.getSlug(), request("kept reply", root.getId()));

        commentService.deleteComment(root.getId());

        CommentDto listed = commentService.listComments(post.getSlug(), 0, 20).getContent().get(0);
        assertThat(listed.getStatus()).isEqualTo("DELETED");
        assertThat(listed.getContent()).isNull();
        assertThat(listed.getAuthor()).isNull();
        assertThat(listed.getReplies()).singleElement()
                .satisfies(r -> assertThat(r.getContent()).isEqualTo("kept reply"));
        assertThat(commentCount()).isEqualTo(1);

        // Deleting it again must neither succeed nor change the counter.
        assertStatus(() -> commentService.deleteComment(root.getId()), HttpStatus.NOT_FOUND);
        assertThat(commentCount()).isEqualTo(1);
    }

    @Test
    void cannotReplyToADeletedComment() {
        as(alice);
        CommentDto root = commentService.createComment(post.getSlug(), request("root", null));
        commentService.deleteComment(root.getId());

        assertStatus(() -> commentService.createComment(post.getSlug(), request("late", root.getId())),
                HttpStatus.BAD_REQUEST);
    }

    @Test
    void onlyTheAuthorEditsButStaffMayDelete() {
        as(bob);
        CommentDto comment = commentService.createComment(post.getSlug(), request("mine", null));

        as(alice);
        assertStatus(() -> commentService.updateComment(comment.getId(), update("hijack")), HttpStatus.FORBIDDEN);
        assertStatus(() -> commentService.deleteComment(comment.getId()), HttpStatus.FORBIDDEN);

        as(bob);
        assertThat(commentService.updateComment(comment.getId(), update("edited")).getContent())
                .isEqualTo("edited");

        as(moderator);
        commentService.deleteComment(comment.getId());
        assertThat(commentCount()).isZero();
    }

    @Test
    void lockedPostsRejectNewCommentsButStillListThem() {
        as(alice);
        commentService.createComment(post.getSlug(), request("before lock", null));
        post.setStatus(PostStatus.LOCKED);
        postRepository.saveAndFlush(post);

        assertStatus(() -> commentService.createComment(post.getSlug(), request("after lock", null)),
                HttpStatus.CONFLICT);
        assertThat(commentService.listComments(post.getSlug(), 0, 20).getContent()).hasSize(1);
    }

    @Test
    void draftPostsHaveNoPublicComments() {
        as(alice);
        post.setStatus(PostStatus.DRAFT);
        postRepository.saveAndFlush(post);

        assertStatus(() -> commentService.listComments(post.getSlug(), 0, 20), HttpStatus.NOT_FOUND);
        assertStatus(() -> commentService.createComment(post.getSlug(), request("x", null)), HttpStatus.NOT_FOUND);
    }

    // ───────────────────────── helpers ─────────────────────────

    /** Re-reads the counter from the database; the atomic UPDATE bypasses the persistence context. */
    private int commentCount() {
        entityManager.flush();
        entityManager.clear();
        return postRepository.findById(post.getId()).orElseThrow().getCommentCount();
    }

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

    private static CreateCommentRequest request(String content, Long parentId) {
        CreateCommentRequest request = new CreateCommentRequest();
        ReflectionTestUtils.setField(request, "content", content);
        ReflectionTestUtils.setField(request, "parentId", parentId);
        return request;
    }

    private static UpdateCommentRequest update(String content) {
        UpdateCommentRequest request = new UpdateCommentRequest();
        ReflectionTestUtils.setField(request, "content", content);
        return request;
    }

    private static void assertStatus(Runnable action, HttpStatus status) {
        assertThatThrownBy(action::run)
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getStatus()).isEqualTo(status));
    }
}
