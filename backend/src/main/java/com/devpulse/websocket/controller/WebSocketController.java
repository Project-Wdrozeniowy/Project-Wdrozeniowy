package com.devpulse.websocket.controller;

import com.devpulse.websocket.dto.PostSubscriptionRequest;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

/**
 * STOMP WebSocket controller.
 *
 * <p>Clients connect to {@code /ws} (or {@code /ws} with SockJS fallback) and
 * authenticate by passing the JWT in the STOMP {@code CONNECT} frame:
 * <pre>
 *   CONNECT
 *   Authorization: Bearer &lt;accessToken&gt;
 * </pre>
 *
 * <h2>Subscribable topics (server → client broadcasts)</h2>
 * <table border="1">
 *   <tr><th>Destination</th><th>Payload</th><th>Description</th></tr>
 *   <tr>
 *     <td>{@code /topic/posts/{postId}/comments}</td>
 *     <td>{@link com.devpulse.websocket.dto.NewCommentEvent}</td>
 *     <td>New comment added to a post thread</td>
 *   </tr>
 *   <tr>
 *     <td>{@code /topic/posts/{postId}/votes}</td>
 *     <td>{@link com.devpulse.websocket.dto.VoteScoreEvent}</td>
 *     <td>Vote score updated on a post or its comment</td>
 *   </tr>
 *   <tr>
 *     <td>{@code /topic/activity}</td>
 *     <td>{@code Map<String,Object>}</td>
 *     <td>Platform-wide activity feed (admin dashboard)</td>
 *   </tr>
 *   <tr>
 *     <td>{@code /user/queue/notifications}</td>
 *     <td>{@link com.devpulse.notification.dto.NotificationDto}</td>
 *     <td>Personal notification for the connected user (unicast)</td>
 *   </tr>
 * </table>
 *
 * <h2>Application destinations (client → server)</h2>
 * <table border="1">
 *   <tr><th>Destination</th><th>Payload</th><th>Description</th></tr>
 *   <tr>
 *     <td>{@code /app/subscribe-post/{postId}}</td>
 *     <td>{@link PostSubscriptionRequest}</td>
 *     <td>Signal intent to receive updates for a post thread; persists subscription in DB</td>
 *   </tr>
 *   <tr>
 *     <td>{@code /app/unsubscribe-post/{postId}}</td>
 *     <td>{@link PostSubscriptionRequest}</td>
 *     <td>Stop receiving updates for a post thread; removes DB subscription</td>
 *   </tr>
 * </table>
 */
@Controller
public class WebSocketController {

    /**
     * Handles a client request to subscribe to a post thread.
     *
     * <p>Records a {@code post_subscriptions} row for the authenticated user so
     * that future comment and vote events for this post are broadcast to
     * {@code /topic/posts/{postId}/comments} and {@code /topic/posts/{postId}/votes}.
     *
     * @param postId  the post ID extracted from the destination path
     * @param request message payload (may carry additional metadata in the future)
     */
    @MessageMapping("/subscribe-post/{postId}")
    public void subscribeToPost(
            @DestinationVariable Long postId,
            @Payload PostSubscriptionRequest request) {
        // TODO: persist subscription; validate that the authenticated principal matches
    }

    /**
     * Handles a client request to unsubscribe from a post thread.
     *
     * @param postId  the post ID extracted from the destination path
     * @param request message payload
     */
    @MessageMapping("/unsubscribe-post/{postId}")
    public void unsubscribeFromPost(
            @DestinationVariable Long postId,
            @Payload PostSubscriptionRequest request) {
        // TODO: remove subscription
    }
}
