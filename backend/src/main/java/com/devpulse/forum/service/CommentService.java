package com.devpulse.forum.service;

import com.devpulse.auth.entity.User;
import com.devpulse.auth.entity.UserStatus;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.common.dto.PagedResponse;
import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.CommentDto;
import com.devpulse.forum.dto.CreateCommentRequest;
import com.devpulse.forum.dto.UpdateCommentRequest;
import com.devpulse.forum.entity.Comment;
import com.devpulse.forum.entity.CommentStatus;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.repository.CommentRepository;
import com.devpulse.forum.repository.PostRepository;
import com.devpulse.notification.entity.NotificationType;
import com.devpulse.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.devpulse.forum.security.ForumAuthorities.isStaff;

/**
 * Comments on forum posts.
 *
 * <ul>
 *   <li>Comments are read wherever their post can be read
 *       ({@link PostService#loadReadable(String)}). A page holds root
 *       comments, oldest first, each with its replies down to depth
 *       {@value #MAX_DEPTH}, oldest first. Deleted comments stay in the
 *       thread as placeholders without content or author, so their replies
 *       keep their place; hidden (moderated) comments are left out with their
 *       replies.</li>
 *   <li>Anyone authenticated may comment on a published post. A reply goes
 *       one level below its parent, a comment of the same post; deeper than
 *       {@value #MAX_DEPTH} answers 422. Locked posts take comments from staff
 *       only (403 for others), drafts from nobody (409).</li>
 *   <li>The author and staff may edit or delete a visible comment; deleting
 *       is a soft delete. On a locked post only staff may.</li>
 *   <li>{@code posts.comment_count} and {@code users.comment_count} count
 *       comments that are not deleted, with atomic updates; a new comment is
 *       also the post's latest activity.</li>
 *   <li>A new comment notifies the post's subscribers
 *       ({@link PostSubscriptionService#subscribersToNotify}) with
 *       {@code COMMENT_ON_POST}, and the author of the comment it replies to,
 *       if their account is active, with {@code REPLY_TO_COMMENT} instead.
 *       Nobody is notified about their own comment. Both notifications relate
 *       to the new comment ({@code COMMENT} and its id).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class CommentService {

    /** Deepest allowed reply; the {@code comments_depth_check} constraint of migration V2. */
    public static final int MAX_DEPTH = 5;

    public static final int MAX_PAGE_SIZE = 50;

    /** Statuses shown in a thread; deleted ones as placeholders. */
    private static final Set<CommentStatus> LISTED = EnumSet.of(CommentStatus.VISIBLE, CommentStatus.DELETED);

    private static final String COMMENT_ENTITY = "COMMENT";

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final PostService postService;
    private final PostSubscriptionService subscriptionService;
    private final NotificationService notificationService;
    private final AuthenticatedUserResolver currentUser;

    /**
     * One page of the post's root comments with their replies.
     *
     * @throws AppException HTTP 400 if the page or size is out of range;
     *                      HTTP 404 if the caller may not read the post
     */
    @Transactional(readOnly = true)
    public PagedResponse<CommentDto> list(String slug, int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new AppException("page must be >= 0 and size between 1 and " + MAX_PAGE_SIZE,
                    HttpStatus.BAD_REQUEST);
        }
        Post post = postService.loadReadable(slug);
        Page<Comment> roots = commentRepository.findRoots(post.getId(), LISTED, PageRequest.of(page, size));
        Map<Long, List<Comment>> replies = repliesBelow(roots.getContent());
        return PagedResponse.from(roots, root -> tree(root, replies));
    }

    /**
     * Adds a comment by the caller, or a reply when {@code parentId} is set.
     *
     * @throws AppException HTTP 404 if the caller may not read the post or the
     *                      parent is not a listed comment of it; HTTP 403 if
     *                      the post is locked; HTTP 409 if it is a draft or the
     *                      parent was deleted; HTTP 422 deeper than
     *                      {@value #MAX_DEPTH}
     */
    @Transactional
    public CommentDto create(String slug, CreateCommentRequest request) {
        User author = currentUser.currentUser();
        Post post = postService.loadReadable(slug);
        requireOpen(post);
        Comment parent = request.getParentId() == null ? null : parentIn(post, request.getParentId());
        int depth = parent == null ? 0 : parent.getDepth() + 1;
        if (depth > MAX_DEPTH) {
            throw new AppException("Replies can be nested at most " + MAX_DEPTH + " levels deep",
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }

        Comment comment = commentRepository.saveAndFlush(Comment.builder()
                .postId(post.getId())
                .author(author)
                .parentId(parent == null ? null : parent.getId())
                .content(request.getContent().strip())
                .depth((short) depth)
                .build());
        postRepository.commentAdded(post.getId(), OffsetDateTime.now());
        userRepository.adjustCommentCount(author.getId(), 1);
        notifyAbout(comment, post, parent, author);
        return CommentDto.from(comment, List.of());
    }

    /**
     * Replaces the content of a visible comment.
     *
     * @throws AppException HTTP 404 if the comment is not visible or the caller
     *                      may not read its post; HTTP 403 if the caller is
     *                      neither its author nor staff, or the post is locked
     */
    @Transactional
    public CommentDto update(Long id, UpdateCommentRequest request) {
        Comment comment = changeable(id);
        comment.setContent(request.getContent().strip());
        return CommentDto.from(commentRepository.saveAndFlush(comment), List.of());
    }

    /**
     * Soft-deletes a visible comment; its replies stay.
     *
     * @throws AppException HTTP 404 if the comment is not visible or the caller
     *                      may not read its post; HTTP 403 if the caller is
     *                      neither its author nor staff, or the post is locked
     */
    @Transactional
    public void delete(Long id) {
        Comment comment = changeable(id);
        comment.setStatus(CommentStatus.DELETED);
        commentRepository.saveAndFlush(comment);
        postRepository.commentRemoved(comment.getPostId());
        userRepository.adjustCommentCount(comment.getAuthor().getId(), -1);
    }

    /** A visible comment the caller may change. */
    private Comment changeable(Long id) {
        User caller = currentUser.currentUser();
        Comment comment = commentRepository.findWithAuthorById(id)
                .filter(found -> found.getStatus() == CommentStatus.VISIBLE)
                .orElseThrow(() -> new AppException("Comment not found", HttpStatus.NOT_FOUND));
        Post post = postService.loadReadable(comment.getPostId());
        if (!comment.getAuthor().getId().equals(caller.getId()) && !isStaff(auth())) {
            throw new AppException("Only the author or staff can change a comment", HttpStatus.FORBIDDEN);
        }
        requireOpen(post);
        return comment;
    }

    /** Drafts take no comments; locked posts only from staff. */
    private static void requireOpen(Post post) {
        if (post.getStatus() == PostStatus.DRAFT) {
            throw new AppException("Only published posts can be commented on", HttpStatus.CONFLICT);
        }
        if (post.getStatus() == PostStatus.LOCKED && !isStaff(auth())) {
            throw new AppException("Post is locked", HttpStatus.FORBIDDEN);
        }
    }

    /** The comment of {@code post} to reply to; hidden comments and other posts' comments read as missing. */
    private Comment parentIn(Post post, Long parentId) {
        Comment parent = commentRepository.findWithAuthorById(parentId)
                .filter(found -> found.getPostId().equals(post.getId()) && LISTED.contains(found.getStatus()))
                .orElseThrow(() -> new AppException("Parent comment not found", HttpStatus.NOT_FOUND));
        if (parent.getStatus() == CommentStatus.DELETED) {
            throw new AppException("Cannot reply to a deleted comment", HttpStatus.CONFLICT);
        }
        return parent;
    }

    private void notifyAbout(Comment comment, Post post, Comment parent, User author) {
        String title = "\"" + post.getTitle() + "\"";
        List<Long> subscribers = new ArrayList<>(subscriptionService.subscribersToNotify(post.getId(), author.getId()));
        if (parent != null) {
            User parentAuthor = parent.getAuthor();
            subscribers.remove(parentAuthor.getId());
            if (!parentAuthor.getId().equals(author.getId()) && parentAuthor.getStatus() == UserStatus.ACTIVE) {
                notificationService.send(List.of(parentAuthor.getId()), author, NotificationType.REPLY_TO_COMMENT,
                        COMMENT_ENTITY, comment.getId(), author.getUsername() + " replied to your comment on " + title);
            }
        }
        notificationService.send(subscribers, author, NotificationType.COMMENT_ON_POST,
                COMMENT_ENTITY, comment.getId(), author.getUsername() + " commented on " + title);
    }

    /** Listed replies below {@code roots} by parent id, one query per level. */
    private Map<Long, List<Comment>> repliesBelow(List<Comment> roots) {
        Map<Long, List<Comment>> byParent = new HashMap<>();
        List<Long> parentIds = roots.stream().map(Comment::getId).toList();
        for (int level = 1; level <= MAX_DEPTH && !parentIds.isEmpty(); level++) {
            List<Comment> replies = commentRepository.findReplies(parentIds, LISTED);
            replies.forEach(reply -> byParent.computeIfAbsent(reply.getParentId(), key -> new ArrayList<>()).add(reply));
            parentIds = replies.stream().map(Comment::getId).toList();
        }
        return byParent;
    }

    private static CommentDto tree(Comment comment, Map<Long, List<Comment>> replies) {
        return CommentDto.from(comment, replies.getOrDefault(comment.getId(), List.of()).stream()
                .map(reply -> tree(reply, replies))
                .toList());
    }

    private static Authentication auth() {
        return SecurityContextHolder.getContext().getAuthentication();
    }
}
