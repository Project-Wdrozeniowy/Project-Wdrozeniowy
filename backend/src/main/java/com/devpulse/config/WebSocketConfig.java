package com.devpulse.config;

import com.devpulse.websocket.NotificationConnections;
import com.devpulse.websocket.interceptor.WebSocketAuthInterceptor;
import com.devpulse.websocket.security.WsHandshake;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.broker.SimpleBrokerMessageHandler;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.ExecutorChannelInterceptor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.web.socket.config.annotation.*;

/** One personal notification path. Post broadcast scaffolding (PWDRZ-35) stays denied. */
@Configuration @EnableWebSocketMessageBroker @RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final WebSocketAuthInterceptor authentication;
    private final NotificationConnections connections;
    private final WsHandshake handshake;
    @Value("${app.ws.allowed-origins:http://localhost:3001,http://localhost:3000}") private String[] origins;

    @Override public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.setErrorHandler(new com.devpulse.websocket.security.WsProtocolErrors());
        for (String origin : origins) {
            var uri = java.net.URI.create(origin);
            if (uri.getHost() == null || !java.util.Set.of("http", "https").contains(uri.getScheme())
                    || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
                    || !(uri.getPath().isEmpty() || uri.getPath().equals("/")))
                throw new IllegalArgumentException("WS origins must be explicit HTTP(S) origins");
        }
        if (origins.length == 0) throw new IllegalArgumentException("WS origins are required");
        registry.addEndpoint("/ws").addInterceptors(handshake).setAllowedOrigins(origins).withSockJS()
                .setHttpMessageCacheSize(32).setDisconnectDelay(5000).setStreamBytesLimit(65536);
    }
    @Bean public ThreadPoolTaskScheduler notificationHeartbeatScheduler() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("notification-heartbeat-");
        return scheduler;
    }
    @Override public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.enableSimpleBroker("/queue").setHeartbeatValue(new long[]{10000, 10000})
                .setTaskScheduler(notificationHeartbeatScheduler());
        registry.setUserDestinationPrefix("/user");
        registry.setPreservePublishOrder(true);
        registry.configureBrokerChannel().interceptors(readiness());
    }
    @Override public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authentication);
    }
    @Override public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override public Message<?> preSend(Message<?> message, MessageChannel channel) {
                return SimpMessageHeaderAccessor.getMessageType(message.getHeaders()) != SimpMessageType.MESSAGE
                        || connections.valid(SimpMessageHeaderAccessor.getSessionId(message.getHeaders())) ? message : null;
            }
        });
    }
    @Override public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(16384).setSendBufferSizeLimit(65536).setSendTimeLimit(10000)
                .setTimeToFirstMessage(10000).addDecoratorFactory(handler -> new WebSocketHandlerDecorator(handler) {
                    @Override public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                        connections.opened(session);
                        super.afterConnectionEstablished(session);
                    }
                    @Override public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
                        connections.closed(session.getId());
                        super.afterConnectionClosed(session, status);
                    }
                });
    }
    // A ready frame follows actual broker registration, not merely receipt of SUBSCRIBE on the inbound channel.
    private ExecutorChannelInterceptor readiness() {
        return new ExecutorChannelInterceptor() {
            @Override public void afterMessageHandled(Message<?> message, MessageChannel channel,
                    MessageHandler handler, Exception error) {
                if (error == null && handler instanceof SimpleBrokerMessageHandler
                        && SimpMessageHeaderAccessor.getMessageType(message.getHeaders()) == SimpMessageType.SUBSCRIBE)
                    connections.ready(SimpMessageHeaderAccessor.getSessionId(message.getHeaders()));
            }
        };
    }
}
