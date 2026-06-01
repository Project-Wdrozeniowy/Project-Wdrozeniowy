package com.devpulse.websocket.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Message sent by a client to {@code /app/subscribe-post/{postId}}
 * or {@code /app/unsubscribe-post/{postId}} to manage post thread subscriptions.
 */
@Getter
@NoArgsConstructor
@Schema(description = "Client request to subscribe or unsubscribe from a post thread")
public class PostSubscriptionRequest {

    @NotNull
    @Schema(description = "Post ID to subscribe or unsubscribe from", example = "101")
    private Long postId;
}
