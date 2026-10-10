package com.devpulse.forum.service;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
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
import com.devpulse.user.dto.UserSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Business logic for comments on forum posts.
 *
 * <p>Authorization rules:
 * <ul>
 *   <li>Anyone authenticated may comment on a published post.</li>
 *   <li>Only the author may edit a comment.</li>
 *   <li>The author, moderators and admins may delete a comment.</li>
 * </ul>
 *
 * <p>Permissions are enforced here rather than with {@code @PreAuthorize}, because the global
 * exception handler would turn a method-security {@code AccessDeniedException} into a 500.
 *
 * <p>Deletion is a soft delete. Deleted comments stay in listings as content-free placeholders
 * so their replies keep their context; hidden (moderated) comments are excluded.
 */
@Service
@RequiredArgsConstructor
public class CommentService {

    /** Maximum nesting depth, matching the {@code comments_depth_check} database constraint. */
    static final int MAX_DEPTH = 5;
    static final int MAX_PAGE_SIZE = 100;

    /** Roles allowed to delete other users' comments. */
    private static final Set<Role> STAFF_ROLES = EnumSet.of(Role.ADMIN, Role.MODERATOR);

    private static final Set<CommentStatus> LISTED = EnumSet.of(CommentStatus.VISIBLE, CommentStatus.DELETED);

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final AuthenticatedUserResolver currentUser;

    /**
     * One page of a post's root comments, each with its full reply tree (up to {@link #MAX_DEPTH} levels).
     * Pagination applies to root comments only.
     */
    @Transactional(readOnly = true)
    public PagedResponse<CommentDto> listComments(String slug, int page, int size) {
        Post post = findReadablePost(slug);
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        Page<Comment> roots = commentRepository.findRoots(post.getId(), LISTED, pageable);

        Map<Long, List<Comment>> repliesByParent = loadReplyTree(roots.getContent());
        return PagedResponse.from(roots, root -> toTree(root, repliesByParent));
    }

    /** Adds a comment (or a reply, when {@code parentId} is set) to a post. */
    @Transactional
    public CommentDto createComment(String slug, CreateCommentRequest request) {
        Post post = findReadablePost(slug);
        if (post.getStatus() == PostStatus.LOCKED) {
            throw new AppException("Post is locked", HttpStatus.CONFLICT);
        }
        User author = currentUser.currentUser();

        Comment parent = null;
        int depth = 0;
        if (request.getParentId() != null) {
            parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new AppException("Parent comment not found", HttpStatus.NOT_FOUND));
            if (!parent.getPost().getId().equals(post.getId())) {
                throw new AppException("Parent comment belongs to a different post", HttpStatus.BAD_REQUEST);
            }
            if (parent.getStatus() != CommentStatus.VISIBLE) {
                throw new AppException("Cannot reply to a removed comment", HttpStatus.BAD_REQUEST);
            }
            depth = parent.getDepth() + 1;
            if (depth > MAX_DEPTH) {
                throw new AppException("Maximum comment nesting depth (" + MAX_DEPTH + ") exceeded",
                        HttpStatus.UNPROCESSABLE_ENTITY);
            }
        }

        Comment saved = commentRepository.save(Comment.builder()
                .post(post)
                .author(author)
                .parent(parent)
                .content(request.getContent().strip())
                .depth((short) depth)
                .build());
        postRepository.incrementCommentCount(post.getId(), OffsetDateTime.now());

        return toDto(saved, List.of());
    }

    /** Edits a comment's content. Only the author may do this, and only while it is visible. */
    @Transactional
    public CommentDto updateComment(Long id, UpdateCommentRequest request) {
        Comment comment = findVisibleComment(id);
        User user = currentUser.currentUser();
        if (!comment.getAuthor().getId().equals(user.getId())) {
            throw new AppException("You can only edit your own comments", HttpStatus.FORBIDDEN);
        }
        comment.setContent(request.getContent().strip());
        return toDto(commentRepository.save(comment), List.of());
    }

    /** Soft-deletes a comment. Allowed for its author, moderators and admins. */
    @Transactional
    public void deleteComment(Long id) {
        Comment comment = findVisibleComment(id);
        User user = currentUser.currentUser();
        boolean isAuthor = comment.getAuthor().getId().equals(user.getId());
        boolean isStaff = STAFF_ROLES.contains(user.getRole());
        if (!isAuthor && !isStaff) {
            throw new AppException("You can only delete your own comments", HttpStatus.FORBIDDEN);
        }
        comment.setStatus(CommentStatus.DELETED);
        commentRepository.save(comment);
        postRepository.decrementCommentCount(comment.getPost().getId());
    }

    // ─── helpers ─────────────────────────────────────────────────────────────────

    /** Resolves a post that exists and is publicly visible (published or locked). */
    private Post findReadablePost(String slug) {
        return postRepository.findBySlug(slug)
                .filter(post -> post.getStatus() == PostStatus.PUBLISHED || post.getStatus() == PostStatus.LOCKED)
                .orElseThrow(() -> new AppException("Post not found", HttpStatus.NOT_FOUND));
    }

    /** A comment that exists and has not been deleted or hidden; otherwise 404 (so deletes are idempotent-safe). */
    private Comment findVisibleComment(Long id) {
        return commentRepository.findById(id)
                .filter(comment -> comment.getStatus() == CommentStatus.VISIBLE)
                .orElseThrow(() -> new AppException("Comment not found", HttpStatus.NOT_FOUND));
    }

    /** Loads all replies under the given roots, one query per nesting level. */
    private Map<Long, List<Comment>> loadReplyTree(List<Comment> roots) {
        Map<Long, List<Comment>> repliesByParent = new HashMap<>();
        List<Long> parentIds = roots.stream().map(Comment::getId).toList();
        for (int level = 1; level <= MAX_DEPTH && !parentIds.isEmpty(); level++) {
            List<Comment> replies = commentRepository.findReplies(parentIds, LISTED);
            for (Comment reply : replies) {
                repliesByParent.computeIfAbsent(reply.getParent().getId(), k -> new ArrayList<>()).add(reply);
            }
            parentIds = replies.stream().map(Comment::getId).toList();
        }
        return repliesByParent;
    }

    private CommentDto toTree(Comment comment, Map<Long, List<Comment>> repliesByParent) {
        List<CommentDto> replies = repliesByParent.getOrDefault(comment.getId(), List.of()).stream()
                .map(reply -> toTree(reply, repliesByParent))
                .toList();
        return toDto(comment, replies);
    }

    private CommentDto toDto(Comment comment, List<CommentDto> replies) {
        boolean deleted = comment.getStatus() == CommentStatus.DELETED;
        return CommentDto.builder()
                .id(comment.getId())
                .postId(comment.getPost().getId())
                .parentId(comment.getParent() != null ? comment.getParent().getId() : null)
                // A deleted comment keeps its place in the thread but exposes neither text nor author.
                .content(deleted ? null : comment.getContent())
                .status(comment.getStatus().name())
                .voteScore(comment.getVoteScore())
                .depth(comment.getDepth())
                .author(deleted ? null : toAuthor(comment.getAuthor()))
                .replies(replies)
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }

    private UserSummaryDto toAuthor(User user) {
        return UserSummaryDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                // Users have no separate display name yet (PWDRZ-95); fall back to the username.
                .displayName(user.getUsername())
                .role(user.getRole().name())
                .build();
    }
}
