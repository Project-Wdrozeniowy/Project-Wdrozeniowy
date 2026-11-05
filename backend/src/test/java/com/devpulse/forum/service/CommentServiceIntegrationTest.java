package com.devpulse.forum.service;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.entity.UserStatus;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.forum.dto.CommentDto;
import com.devpulse.forum.dto.CreateCommentRequest;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.repository.PostRepository;
import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

/**
 * {@link CommentService} against the real schema: the denormalised comment
 * counters, the post's last activity, and who is notified about a new
 * comment. Statuses and roles are checked in
 * {@link com.devpulse.forum.controller.CommentControllerApiTest}.
 */
@MigratedSchemaTest
@Transactional
class CommentServiceIntegrationTest {

    @Autowired private CommentService commentService;
    @Autowired private UserRepository userRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private JdbcTemplate jdbc;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private User author;
    private User commenter;
    private Post post;

    @BeforeEach
    void setUp() {
        author = saveUser("author", UserStatus.ACTIVE);
        commenter = saveUser("commenter", UserStatus.ACTIVE);
        post = postRepository.save(Post.builder()
                .author(author)
                .title("Counted thread")
                .slug("counted-thread-" + run)
                .content("Body")
                .status(PostStatus.PUBLISHED)
                .lastActivityAt(OffsetDateTime.parse("2026-01-01T00:00:00Z"))
                .build());
        postRepository.flush();
    }

    @AfterEach
    void signOut() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void creatingAndDeletingMoveThePostAndAuthorCounters() {
        CommentDto first = commentAs(commenter, "First", null);
        commentAs(commenter, "Second", first.getId());
        commentAs(author, "Third", null);

        assertThat(postCount()).isEqualTo(3);
        assertThat(userCount(commenter)).isEqualTo(2);
        assertThat(userCount(author)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT last_activity_at FROM posts WHERE id = ?", OffsetDateTime.class,
                post.getId())).isAfter(OffsetDateTime.parse("2026-01-01T00:00:00Z"));

        signIn(author, "ROLE_MODERATOR");
        commentService.delete(first.getId());

        assertThat(postCount()).isEqualTo(2);
        assertThat(userCount(commenter)).as("the comment's author loses it, not the moderator").isEqualTo(1);
        assertThat(userCount(author)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM comments WHERE post_id = ? AND status <> 'DELETED'",
                Long.class, post.getId())).isEqualTo(2);
    }

    @Test
    void aCommentNotifiesTheActiveSubscribersExceptItsAuthor() {
        User subscriber = saveUser("subscriber", UserStatus.ACTIVE);
        User banned = saveUser("banned", UserStatus.BANNED);
        subscribe(subscriber);
        subscribe(banned);
        subscribe(commenter);

        CommentDto comment = commentAs(commenter, "Hello", null);

        assertThat(notifications()).extracting(row -> row.get("recipient_id"), row -> row.get("type"),
                        row -> row.get("sender_id"), row -> row.get("entity_type"), row -> row.get("entity_id"),
                        row -> row.get("message"))
                .containsExactly(tuple(subscriber.getId(), "COMMENT_ON_POST", commenter.getId(), "COMMENT",
                        comment.getId(), commenter.getUsername() + " commented on \"Counted thread\""));
    }

    @Test
    void aReplyTellsTheParentAuthorOnceAndTheOtherSubscribersAsUsual() {
        User subscriber = saveUser("subscriber", UserStatus.ACTIVE);
        subscribe(subscriber);
        subscribe(author);
        CommentDto parent = commentAs(author, "Question", null);
        jdbc.update("DELETE FROM notifications WHERE sender_id = ?", author.getId());

        CommentDto reply = commentAs(commenter, "Answer", parent.getId());

        assertThat(notifications()).extracting(row -> row.get("recipient_id"), row -> row.get("type"),
                        row -> row.get("entity_id"), row -> row.get("message"))
                .containsExactlyInAnyOrder(
                        tuple(author.getId(), "REPLY_TO_COMMENT", reply.getId(),
                                commenter.getUsername() + " replied to your comment on \"Counted thread\""),
                        tuple(subscriber.getId(), "COMMENT_ON_POST", reply.getId(),
                                commenter.getUsername() + " commented on \"Counted thread\""));
    }

    @Test
    void nobodyIsToldAboutTheirOwnReplyOrWhileTheirAccountIsInactive() {
        CommentDto own = commentAs(commenter, "Mine", null);
        commentAs(commenter, "Me again", own.getId());
        User deactivated = saveUser("deactivated", UserStatus.DEACTIVATED);
        CommentDto theirs = commentAs(deactivated, "Before leaving", null);

        commentAs(commenter, "To the deactivated", theirs.getId());

        assertThat(notifications()).isEmpty();
    }

    private CommentDto commentAs(User user, String content, Long parentId) {
        signIn(user, "ROLE_USER");
        CreateCommentRequest request = new CreateCommentRequest();
        ReflectionTestUtils.setField(request, "content", content);
        ReflectionTestUtils.setField(request, "parentId", parentId);
        return commentService.create(post.getSlug(), request);
    }

    private static void signIn(User user, String authority) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                user.getUsername(), null, List.of(new SimpleGrantedAuthority(authority))));
    }

    private void subscribe(User user) {
        jdbc.update("INSERT INTO post_subscriptions (user_id, post_id) VALUES (?, ?)", user.getId(), post.getId());
    }

    private List<Map<String, Object>> notifications() {
        return jdbc.queryForList("SELECT n.recipient_id, CAST(n.type AS text) AS type, n.sender_id, n.entity_type, "
                + "n.entity_id, n.message FROM notifications n JOIN users u ON u.id = n.recipient_id "
                + "WHERE u.username LIKE ? ORDER BY n.id", "%-" + run);
    }

    private int postCount() {
        return jdbc.queryForObject("SELECT comment_count FROM posts WHERE id = ?", Integer.class, post.getId());
    }

    private int userCount(User user) {
        return jdbc.queryForObject("SELECT comment_count FROM users WHERE id = ?", Integer.class, user.getId());
    }

    private User saveUser(String name, UserStatus status) {
        String username = name + "-" + run;
        return userRepository.saveAndFlush(User.builder()
                .username(username)
                .email(username + "@example.com")
                .passwordHash("hash")
                .role(Role.USER)
                .status(status)
                .build());
    }
}
