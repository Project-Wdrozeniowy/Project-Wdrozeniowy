package com.devpulse.forum.service;

import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.CommentResponse;
import com.devpulse.forum.dto.CreateCommentRequest;
import com.devpulse.forum.entity.Comment;
import com.devpulse.forum.entity.CommentStatus;
import com.devpulse.forum.repository.CommentRepository;
import com.devpulse.forum.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<CommentResponse> getComments(Long postId, Pageable pageable) {
        if (!postRepository.existsById(postId)) {
            throw new AppException("Post not found", HttpStatus.NOT_FOUND);
        }

        Page<Comment> roots = commentRepository.findRootCommentsByPostId(
                postId, CommentStatus.VISIBLE, pageable);

        List<Long> rootIds = roots.stream().map(Comment::getId).toList();
        List<Comment> replies = rootIds.isEmpty()
                ? List.of()
                : commentRepository.findRepliesByParentIds(rootIds, CommentStatus.VISIBLE);

        Map<Long, List<Comment>> repliesByParent = replies.stream()
                .collect(Collectors.groupingBy(c -> c.getParent().getId()));

        return roots.map(root -> buildResponse(root, repliesByParent));
    }

    @Transactional
    public CommentResponse addComment(Long postId, CreateCommentRequest request, String username) {
        var post = postRepository.findById(postId)
                .orElseThrow(() -> new AppException("Post not found", HttpStatus.NOT_FOUND));

        User author = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        Comment comment = new Comment();
        comment.setPost(post);
        comment.setAuthor(author);
        comment.setContent(request.content());

        if (request.parentId() != null) {
            Comment parent = commentRepository.findById(request.parentId())
                    .orElseThrow(() -> new AppException("Parent comment not found", HttpStatus.NOT_FOUND));
            if (!parent.getPost().getId().equals(postId)) {
                throw new AppException("Parent comment does not belong to this post", HttpStatus.BAD_REQUEST);
            }
            int newDepth = parent.getDepth() + 1;
            if (newDepth > 5) {
                throw new AppException("Maximum comment nesting depth exceeded", HttpStatus.BAD_REQUEST);
            }
            comment.setParent(parent);
            comment.setDepth((short) newDepth);
        }

        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);

        return CommentResponse.from(commentRepository.save(comment), List.of());
    }

    @Transactional
    public void deleteComment(Long commentId, String username) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new AppException("Comment not found", HttpStatus.NOT_FOUND));

        if (!comment.getAuthor().getUsername().equals(username)) {
            throw new AppException("You can only delete your own comments", HttpStatus.FORBIDDEN);
        }

        comment.setStatus(CommentStatus.DELETED);
        commentRepository.save(comment);

        comment.getPost().setCommentCount(
                Math.max(0, comment.getPost().getCommentCount() - 1));
        postRepository.save(comment.getPost());
    }

    private CommentResponse buildResponse(Comment root, Map<Long, List<Comment>> repliesByParent) {
        List<CommentResponse> replies = repliesByParent
                .getOrDefault(root.getId(), List.of())
                .stream()
                .map(reply -> buildResponse(reply, repliesByParent))
                .toList();
        return CommentResponse.from(root, replies);
    }
}
