package com.devpulse.forum.dto;

import com.devpulse.forum.entity.Comment;
import com.devpulse.forum.entity.CommentStatus;
import com.devpulse.user.dto.UserSummaryDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * A comment as readers see it. A deleted comment keeps its place in the
 * thread as a placeholder: its content and author are {@code null}.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Comment on a forum post, optionally with nested replies")
public class CommentDto {

    @Schema(description = "Comment ID", example = "55")
    private Long id;

    @Schema(description = "ID of the post this comment belongs to", example = "101")
    private Long postId;

    @Schema(description = "ID of the parent comment; null for root comments", example = "54", nullable = true)
    private Long parentId;

    @Schema(description = "Comment content (Markdown); null for a deleted comment", nullable = true)
    private String content;

    @Schema(description = "Comment status; only VISIBLE and DELETED comments are listed", example = "VISIBLE")
    private CommentStatus status;

    @Schema(description = "Cumulative vote score")
    private int voteScore;

    @Schema(description = "Nesting depth (0 = root comment, maximum allowed depth is 5)")
    private int depth;

    @Schema(description = "Comment author; null for a deleted comment", nullable = true)
    private UserSummaryDto author;

    @Schema(description = "Direct replies, oldest first, each with its own replies down to depth 5. "
            + "Empty in the responses to creating and updating a comment.")
    private List<CommentDto> replies;

    @Schema(description = "Creation timestamp")
    private OffsetDateTime createdAt;

    @Schema(description = "Last update timestamp")
    private OffsetDateTime updatedAt;

    /** Builds the representation of {@code comment} with {@code replies}; the author must be loaded. */
    public static CommentDto from(Comment comment, List<CommentDto> replies) {
        boolean deleted = comment.getStatus() == CommentStatus.DELETED;
        return CommentDto.builder()
                .id(comment.getId())
                .postId(comment.getPostId())
                .parentId(comment.getParentId())
                .content(deleted ? null : comment.getContent())
                .status(comment.getStatus())
                .voteScore(comment.getVoteScore())
                .depth(comment.getDepth())
                .author(deleted ? null : UserSummaryDto.from(comment.getAuthor()))
                .replies(replies)
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }
}
