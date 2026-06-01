package com.devpulse.config;

import com.devpulse.websocket.interceptor.WebSocketAuthInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP-over-WebSocket configuration.
 *
 * <h2>Connection endpoint</h2>
 * <pre>
 *   ws://host/ws          — native WebSocket
 *   http://host/ws        — SockJS fallback (for browsers that don't support WS)
 * </pre>
 *
 * <h2>Topic conventions</h2>
 * <pre>
 *   /topic/posts/{postId}/comments   — broadcast: new comment added to a post
 *   /topic/posts/{postId}/votes      — broadcast: vote score updated on a post
 *   /topic/activity                  — broadcast: platform-wide activity feed (admin)
 *   /user/queue/notifications        — unicast: personal notification for the connected user
 * </pre>
 *
 * <h2>Application destinations (client → server)</h2>
 * <pre>
 *   /app/subscribe-post/{postId}     — signal intent to receive updates for a post thread
 *   /app/unsubscribe-post/{postId}   — stop receiving updates for a post thread
 * </pre>
 *
 * <p>Authentication: clients must send the JWT access token in the STOMP
 * {@code CONNECT} frame header ({@code Authorization: Bearer <token>}).
 * The token is validated by {@link com.devpulse.websocket.interceptor.WebSocketAuthInterceptor}.
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Prefix for messages routed to @MessageMapping methods
        registry.setApplicationDestinationPrefixes("/app");
        // In-memory broker for /topic (broadcast) and /user (unicast) destinations
        registry.enableSimpleBroker("/topic", "/user");
        // Prefix used by the broker to route unicast messages to a specific user
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(webSocketAuthInterceptor);
    }
}
