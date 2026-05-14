package com.devpulse.websocket.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * Payload pushed to {@code /topic/posts/{postId}/comments} when a new comment is created.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "WebSocket event: a new comment was added to a post thread")
public class NewCommentEvent {

    @Schema(description = "Comment ID", example = "55")
    private Long commentId;

    @Schema(description = "ID of the post the comment belongs to", example = "101")
    private Long postId;

    @Schema(description = "ID of the parent comment, null for root comments")
    private Long parentId;

    @Schema(description = "Comment author username", example = "johndoe")
    private String authorUsername;

    @Schema(description = "Comment content (Markdown)", example = "Great post!")
    private String content;

    @Schema(description = "Nesting depth (0 = root comment)", example = "0")
    private int depth;

    @Schema(description = "Creation timestamp")
    private OffsetDateTime createdAt;
}
