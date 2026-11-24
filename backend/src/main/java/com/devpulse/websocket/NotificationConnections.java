package com.devpulse.websocket;

import com.devpulse.websocket.dto.NotificationCreatedEvent;
import com.devpulse.websocket.security.WsSessionAccess;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Local transport handles, never another credential store. Sends recheck JDBC/account validity. */
@Component @RequiredArgsConstructor @Slf4j
public class NotificationConnections {
    private record Connection(WebSocketSession socket, WsSessionAccess.Access access) {}
    private final Map<String, Connection> connections = new ConcurrentHashMap<>();
    private final WsSessionAccess sessions;
    private final ObjectProvider<SimpMessagingTemplate> messaging;
    public void opened(WebSocketSession socket) {
        Object access = socket.getAttributes().get(WsSessionAccess.ATTRIBUTE);
        if (access instanceof WsSessionAccess.Access authenticated)
            connections.put(socket.getId(), new Connection(socket, authenticated));
        else close(socket);
    }
    public void closed(String id) { connections.remove(id); }
    public boolean valid(String id) {
        Connection connection = connections.get(id);
        if (connection == null) return false;
        try {
            if (sessions.read(connection.access().sessionId(), connection.access().principal()) != null) return true;
        } catch (RuntimeException unavailable) { log.warn("Notification session validation unavailable"); }
        disconnect(id);
        return false;
    }
    public void ready(String id) { send(id, Map.of("version", 1, "type", "stream.ready")); }
    public void publish(Long recipientId, Long notificationId) {
        connections.forEach((id, connection) -> {
            if (connection.access().principal().userId().equals(recipientId))
                send(id, NotificationCreatedEvent.of(notificationId));
        });
    }
    private void send(String id, Object payload) {
        if (!valid(id)) return;
        Connection connection = connections.get(id);
        if (connection == null) return;
        try {
            var headers = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
            headers.setSessionId(id);
            headers.setLeaveMutable(true);
            messaging.getObject().convertAndSendToUser(connection.access().principal().getName(),
                    "/queue/notifications", payload, headers.getMessageHeaders());
        } catch (RuntimeException unavailable) {
            log.warn("Notification delivery unavailable");
            disconnect(id);
        }
    }
    @Scheduled(cron = "${app.ws.validation-cron:*/15 * * * * *}")
    public void revalidate() { connections.keySet().forEach(this::valid); }
    public void disconnect(String id) {
        Connection connection = connections.remove(id);
        if (connection != null) close(connection.socket());
    }
    private static void close(WebSocketSession socket) {
        try { socket.close(CloseStatus.POLICY_VIOLATION.withReason("Session unavailable")); }
        catch (java.io.IOException ignored) { /* Already disconnected. */ }
    }
}
