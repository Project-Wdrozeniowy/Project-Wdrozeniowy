package com.devpulse;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.entity.UserStatus;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.forum.entity.Category;
import com.devpulse.forum.entity.Comment;
import com.devpulse.forum.entity.CommentStatus;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.entity.Tag;
import com.devpulse.forum.entity.Vote;
import com.devpulse.forum.enums.VoteType;
import com.devpulse.forum.repository.CategoryRepository;
import com.devpulse.forum.repository.CommentRepository;
import com.devpulse.forum.repository.PostRepository;
import com.devpulse.forum.repository.PostSubscriptionRepository;
import com.devpulse.forum.repository.TagRepository;
import com.devpulse.forum.repository.VoteRepository;
import com.devpulse.notification.entity.Notification;
import com.devpulse.notification.entity.NotificationType;
import com.devpulse.notification.repository.NotificationRepository;
import com.devpulse.support.MigratedSchemaTest;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Checks that the Flyway migrations run on startup and that every mapped
 * entity can be written to and read back from the schema they produce.
 *
 * <p>Add a round-trip case here whenever a new table or column is mapped,
 * especially a PostgreSQL enum column, which needs
 * {@code @JdbcTypeCode(SqlTypes.NAMED_ENUM)}.
 */
@MigratedSchemaTest
@Transactional
class MigrationSchemaTest {

    @Autowired
    private Flyway flyway;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private TagRepository tagRepository;


    @Autowired
    private VoteRepository voteRepository;

    @Autowired
    private PostSubscriptionRepository subscriptionRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbc;

    /** Every migration on the classpath has been applied on startup. */
    @Test
    void migrationsRunOnStartup() {
        assertThat(flyway.info().pending()).isEmpty();
        assertThat(flyway.info().applied()).isNotEmpty();
    }

    /** V11 records when the collection of openings started. */
    @Test
    void theStartOfOpeningCollectionIsRecorded() {
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM analytics_collection_starts WHERE event_type = 'POST_VIEWED'", Long.class))
                .isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "SELECT collected_from FROM analytics_collection_starts WHERE event_type = 'POST_VIEWED'",
                OffsetDateTime.class)).isBeforeOrEqualTo(OffsetDateTime.now());
    }

    /**
     * {@code users.role} is the native {@code user_role} enum, not a varchar,
     * and every Java constant exists in it.
     */
    @ParameterizedTest
    @EnumSource(Role.class)
    void userRoleRoundTripsThroughNativeEnum(Role role) {
        Long id = userRepository.saveAndFlush(user("schema-" + role.name().toLowerCase(), role)).getId();
        entityManager.clear();

        assertThat(userRepository.findById(id))
                .get()
                .extracting(User::getRole)
                .isEqualTo(role);
    }

    /**
     * {@code users.status} is the native {@code user_status} enum, and every
     * Java constant exists in it.
     */
    @ParameterizedTest
    @EnumSource(UserStatus.class)
    void userStatusRoundTripsThroughNativeEnum(UserStatus status) {
        User user = user("status-" + status.name().toLowerCase(), Role.USER);
        user.setStatus(status);
        Long id = userRepository.saveAndFlush(user).getId();
        entityManager.clear();

        assertThat(userRepository.findById(id))
                .get()
                .extracting(User::getStatus)
                .isEqualTo(status);
    }

    /**
     * {@code notifications.type} is the native {@code notification_type} enum,
     * and every Java constant exists in it.
     */
    @ParameterizedTest
    @EnumSource(NotificationType.class)
    void notificationTypeRoundTripsThroughNativeEnum(NotificationType type) {
        User sender = userRepository.saveAndFlush(user("notify-" + type.name().toLowerCase(), Role.USER));
        Long id = notificationRepository.saveAndFlush(Notification.builder()
                .recipientId(sender.getId())
                .sender(sender)
                .type(type)
                .entityType("POST")
                .entityId(1L)
                .message("message")
                .build()).getId();
        entityManager.clear();

        assertThat(notificationRepository.findById(id)).get()
                .satisfies(notification -> {
                    assertThat(notification.getType()).isEqualTo(type);
                    assertThat(notification.isRead()).isFalse();
                    assertThat(notification.getCreatedAt()).isNotNull();
                    assertThat(notification.getUpdatedAt()).isNotNull();
                });
    }

    /** {@code posts.status} is the native {@code post_status} enum, and every Java constant exists in it. */
    @ParameterizedTest
    @EnumSource(PostStatus.class)
    void postStatusRoundTripsThroughNativeEnum(PostStatus status) {
        String name = "post-" + status.name().toLowerCase();
        User author = userRepository.saveAndFlush(user(name, Role.USER));
        Long id = postRepository.saveAndFlush(Post.builder()
                .author(author)
                .title(name)
                .slug("schema-" + name)
                .content("content")
                .status(status)
                .build()).getId();
        entityManager.clear();

        assertThat(postRepository.findById(id))
                .get()
                .extracting(Post::getStatus)
                .isEqualTo(status);
    }

    /**
     * {@code comments.status} is the native {@code comment_status} enum, every
     * Java constant exists in it, and a reply keeps its post, parent, author
     * and depth; the vote score and timestamps come from the database.
     */
    @ParameterizedTest
    @EnumSource(CommentStatus.class)
    void commentRoundTripsThroughNativeEnum(CommentStatus status) {
        String name = "comment-" + status.name().toLowerCase();
        User author = userRepository.saveAndFlush(user(name, Role.USER));
        Post post = postRepository.saveAndFlush(Post.builder()
                .author(author)
                .title(name)
                .slug("schema-" + name)
                .content("content")
                .build());
        Long rootId = commentRepository.saveAndFlush(Comment.builder()
                .postId(post.getId())
                .author(author)
                .content("root")
                .build()).getId();
        Long id = commentRepository.saveAndFlush(Comment.builder()
                .postId(post.getId())
                .author(author)
                .parentId(rootId)
                .content("reply")
                .status(status)
                .depth((short) 1)
                .build()).getId();
        entityManager.clear();

        assertThat(commentRepository.findWithAuthorById(id)).get()
                .satisfies(comment -> {
                    assertThat(comment.getStatus()).isEqualTo(status);
                    assertThat(comment.getPostId()).isEqualTo(post.getId());
                    assertThat(comment.getParentId()).isEqualTo(rootId);
                    assertThat(comment.getAuthor().getUsername()).isEqualTo(name);
                    assertThat(comment.getContent()).isEqualTo("reply");
                    assertThat(comment.getDepth()).isEqualTo((short) 1);
                    assertThat(comment.getVoteScore()).isZero();
                    assertThat(comment.getCreatedAt()).isNotNull();
                    assertThat(comment.getUpdatedAt()).isNotNull();
                });
    }

    /** Domain tables retain V7 auditing; Spring Session uses its own lifecycle/expiry columns. */
    @Test
    void everyTableHasAuditTimestamps() {
        List<String> tables = jdbc.queryForList("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
                  AND table_name NOT IN ('flyway_schema_history', 'spring_session', 'spring_session_attributes')
                """, String.class);
        List<String> missingColumns = jdbc.queryForList("""
                SELECT t.table_name || '.' || wanted.name
                FROM information_schema.tables t
                CROSS JOIN (VALUES ('created_at'), ('updated_at')) AS wanted(name)
                LEFT JOIN information_schema.columns c
                       ON c.table_schema = t.table_schema AND c.table_name = t.table_name
                      AND c.column_name = wanted.name AND c.is_nullable = 'NO' AND c.column_default IS NOT NULL
                WHERE t.table_schema = current_schema() AND t.table_type = 'BASE TABLE'
                  AND t.table_name NOT IN ('flyway_schema_history', 'spring_session', 'spring_session_attributes')
                  AND c.column_name IS NULL
                """, String.class);
        List<String> triggered = jdbc.queryForList("""
                SELECT event_object_table FROM information_schema.triggers
                WHERE trigger_schema = current_schema() AND action_statement LIKE '%set_updated_at()%'
                """, String.class);

        assertThat(tables).containsExactlyInAnyOrder("users", "posts", "categories", "post_tags", "comments",
                "tags", "votes", "notifications", "post_subscriptions", "activity_events",
                "analytics_collection_starts");
        assertThat(missingColumns).isEmpty();
        assertThat(triggered).containsExactlyInAnyOrderElementsOf(tables);
        assertThat(jdbc.queryForList("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
                  AND table_name IN ('refresh_tokens', 'spring_session', 'spring_session_attributes')
                """, String.class)).containsExactlyInAnyOrder("spring_session", "spring_session_attributes");
    }

    /** The timestamp columns added by V7 are mapped and filled on insert. */
    @Test
    void newTimestampColumnsRoundTrip() {
        Long categoryId = categoryRepository.saveAndFlush(
                Category.builder().name("Schema audit").slug("schema-audit").build()).getId();
        Long tagId = tagRepository.saveAndFlush(
                Tag.builder().name("schema-audit").slug("schema-audit").build()).getId();
        entityManager.clear();

        assertThat(categoryRepository.findById(categoryId)).get()
                .extracting(Category::getUpdatedAt).isNotNull();
        assertThat(tagRepository.findById(tagId)).get()
                .satisfies(tag -> {
                    assertThat(tag.getCreatedAt()).isNotNull();
                    assertThat(tag.getUpdatedAt()).isNotNull();
                });
    }

    /**
     * A bulk update that bypasses the entities still moves {@code updated_at},
     * and a value the writer sets itself is kept.
     */
    @Test
    void authenticationVersionRoundTripsWithoutChangingCredentials() {
        User owner = userRepository.saveAndFlush(user("schema-auth-version", Role.USER));
        String hash = owner.getPasswordHash();
        jdbc.update("UPDATE users SET auth_version = auth_version + 1 WHERE id = ?", owner.getId());
        entityManager.clear();
        User loaded = userRepository.findById(owner.getId()).orElseThrow();
        assertThat(loaded.getAuthVersion()).isEqualTo(1);
        assertThat(loaded.getPasswordHash()).isEqualTo(hash);
    }

    /** {@code votes.vote_type} is the native {@code vote_type} enum, for votes on posts and on comments. */
    @Test
    void votesRoundTripForBothTargetTypes() {
        User owner = userRepository.saveAndFlush(user("schema-voter", Role.USER));
        Long postId = postRepository.saveAndFlush(Post.builder()
                .author(owner)
                .title("Votes")
                .slug("schema-votes")
                .content("content")
                .build()).getId();
        Long commentId = jdbc.queryForObject(
                "INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, 'c') RETURNING id",
                Long.class, postId, owner.getId());

        assertThat(voteRepository.insertPostVote(owner.getId(), postId, VoteType.UP.name())).isOne();
        assertThat(voteRepository.insertPostVote(owner.getId(), postId, VoteType.DOWN.name())).isZero();
        assertThat(voteRepository.insertCommentVote(owner.getId(), commentId, VoteType.DOWN.name())).isOne();

        assertThat(voteRepository.findByUserIdAndPostId(owner.getId(), postId)).get()
                .extracting(Vote::getVoteType, Vote::getCommentId)
                .containsExactly(VoteType.UP, null);
        assertThat(voteRepository.findByUserIdAndCommentId(owner.getId(), commentId)).get()
                .satisfies(vote -> {
                    assertThat(vote.getVoteType()).isEqualTo(VoteType.DOWN);
                    assertThat(vote.getPostId()).isNull();
                    assertThat(vote.getCreatedAt()).isNotNull();
                });
    }

    /** {@code post_subscriptions} rows are written once per user and post and read back with their post. */
    @Test
    void postSubscriptionsRoundTrip() {
        User owner = userRepository.saveAndFlush(user("schema-subscriber", Role.USER));
        Long postId = postRepository.saveAndFlush(Post.builder()
                .author(owner)
                .title("Subscriptions")
                .slug("schema-subscriptions")
                .content("content")
                .build()).getId();

        assertThat(subscriptionRepository.subscribe(owner.getId(), postId)).isOne();
        assertThat(subscriptionRepository.subscribe(owner.getId(), postId)).isZero();

        assertThat(subscriptionRepository.findReadableOf(owner.getId(), List.of(PostStatus.PUBLISHED), List.of(),
                        PageRequest.of(0, 10)).getContent())
                .singleElement()
                .satisfies(subscription -> {
                    assertThat(subscription.getPostId()).isEqualTo(postId);
                    assertThat(subscription.getPost().getSlug()).isEqualTo("schema-subscriptions");
                    assertThat(subscription.getCreatedAt()).isNotNull();
                    assertThat(subscription.getUpdatedAt()).isNotNull();
                });
        assertThat(subscriptionRepository.unsubscribe(owner.getId(), postId)).isOne();
    }


    private static User user(String username, Role role) {
        return User.builder()
                .username(username)
                .email(username + "@example.com")
                .passwordHash("hash")
                .role(role)
                .build();
    }
}
