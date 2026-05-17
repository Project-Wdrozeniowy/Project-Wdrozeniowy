package com.devpulse.forum.dto;

import com.devpulse.forum.entity.Comment;

import java.time.OffsetDateTime;
import java.util.List;

public record CommentResponse(
        Long id,
        Long postId,
        Long parentId,
        String content,
        String status,
        int voteScore,
        int depth,
        AuthorResponse author,
        List<CommentResponse> replies,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static CommentResponse from(Comment comment, List<CommentResponse> replies) {
        return new CommentResponse(
                comment.getId(),
                comment.getPost().getId(),
                comment.getParent() != null ? comment.getParent().getId() : null,
                comment.getContent(),
                comment.getStatus().name(),
                comment.getVoteScore(),
                comment.getDepth(),
                AuthorResponse.from(comment.getAuthor()),
                replies,
                comment.getCreatedAt(),
                comment.getUpdatedAt()
        );
    }
}
