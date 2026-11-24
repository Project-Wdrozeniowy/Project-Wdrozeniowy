package com.devpulse.websocket.controller;

import com.devpulse.websocket.dto.PostSubscriptionRequest;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

/**
 * Inactive historical post-broadcast scaffolding (PWDRZ-35).
 * PWDRZ-104 denies all client SEND destinations. Persisted post subscriptions use REST.
 * These handlers and adjacent broadcast DTOs require a separately approved live-thread contract.
 */
@Controller
public class WebSocketController {

    /**
     * Historical future post-broadcast hook. Currently denied by message authorization;
     * it does not persist subscriptions or publish comment/vote events.
     *
     * @param postId  the post ID extracted from the destination path
     * @param request message payload (may carry additional metadata in the future)
     */
    @MessageMapping("/subscribe-post/{postId}")
    public void subscribeToPost(
            @DestinationVariable Long postId,
            @Payload PostSubscriptionRequest request) {
        // PWDRZ-35: intentionally unreachable; REST owns persisted subscriptions.
    }

    /**
     * Historical future post-broadcast hook, currently denied by message authorization.
     *
     * @param postId  the post ID extracted from the destination path
     * @param request message payload
     */
    @MessageMapping("/unsubscribe-post/{postId}")
    public void unsubscribeFromPost(
            @DestinationVariable Long postId,
            @Payload PostSubscriptionRequest request) {
        // PWDRZ-35: intentionally unreachable; REST owns persisted subscriptions.
    }
}
