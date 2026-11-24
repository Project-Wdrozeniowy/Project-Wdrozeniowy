package com.devpulse.websocket.interceptor;

import com.devpulse.websocket.security.WsSessionAccess;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.messaging.web.csrf.XorCsrfChannelInterceptor;
import org.springframework.stereotype.Component;

/** Only the HTTP session's personal queue is readable; no client notification mutations. */
@Component @RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {
    private final WsSessionAccess sessions;
    private final XorCsrfChannelInterceptor csrf = new XorCsrfChannelInterceptor();
    @Override public Message<?> preSend(Message<?> message, MessageChannel channel) {
        var headers = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (headers == null) throw new AccessDeniedException("Invalid notification frame");
        if (headers.getCommand() == StompCommand.DISCONNECT || headers.getCommand() == StompCommand.UNSUBSCRIBE)
            return message;
        Object value = headers.getSessionAttributes() == null ? null
                : headers.getSessionAttributes().get(WsSessionAccess.ATTRIBUTE);
        if (!(value instanceof WsSessionAccess.Access access))
            throw new AccessDeniedException("Handshake unavailable");
        if (sessions.read(access.sessionId(), access.principal()) == null)
            throw new AccessDeniedException("Session unavailable");
        headers.setUser(access.authentication());
        if (headers.getCommand() == StompCommand.CONNECT) {
            csrf.preSend(message, channel);
        } else if (headers.getCommand() == StompCommand.SUBSCRIBE) {
            if (!"/user/queue/notifications".equals(headers.getDestination()))
                throw new AccessDeniedException("Destination unavailable");
            if (headers.getSessionAttributes().putIfAbsent("notificationSubscription", headers.getSubscriptionId()) != null)
                throw new AccessDeniedException("Subscription already registered");
        } else if (headers.getCommand() != null) throw new AccessDeniedException("Command unavailable");
        return message;
    }
}
