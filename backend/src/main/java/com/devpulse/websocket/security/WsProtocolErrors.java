package com.devpulse.websocket.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.messaging.StompSubProtocolErrorHandler;

/** Never echo exception messages: CSRF exceptions and malformed frames may contain credentials. */
@Slf4j
public class WsProtocolErrors extends StompSubProtocolErrorHandler {
    @Override public Message<byte[]> handleClientMessageProcessingError(Message<byte[]> message, Throwable failure) {
        Throwable root = failure;
        while (root.getCause() != null) root = root.getCause();
        String reason = java.util.Set.of("Handshake unavailable", "Session unavailable", "Command unavailable",
                "Destination unavailable", "Invalid notification frame", "Subscription already registered")
                .contains(root.getMessage() == null ? "" : root.getMessage()) ? root.getMessage() : root.getClass().getSimpleName();
        log.warn("Notification protocol rejected ({})", reason);
        var headers = StompHeaderAccessor.create(StompCommand.ERROR);
        headers.setMessage("Notification stream unavailable");
        return MessageBuilder.createMessage(new byte[0], headers.getMessageHeaders());
    }
}
