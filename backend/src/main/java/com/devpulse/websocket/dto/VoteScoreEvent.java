package com.devpulse.websocket.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Payload pushed to {@code /topic/posts/{postId}/votes} when a post's vote score changes.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "WebSocket event: vote score updated on a post or comment")
public class VoteScoreEvent {

    @Schema(description = "Entity type", example = "POST", allowableValues = {"POST", "COMMENT"})
    private String entityType;

    @Schema(description = "Entity ID (post or comment)", example = "101")
    private Long entityId;

    @Schema(description = "New cumulative vote score", example = "42")
    private int newScore;
}
