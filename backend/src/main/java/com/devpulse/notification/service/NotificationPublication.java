package com.devpulse.notification.service;

import com.devpulse.websocket.NotificationConnections;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

@Component @RequiredArgsConstructor @Slf4j
public class NotificationPublication {
    public record Created(Long recipientId, Long notificationId) {}
    private final NotificationConnections connections;
    @TransactionalEventListener
    public void committed(Created event) {
        try { connections.publish(event.recipientId(), event.notificationId()); }
        catch (RuntimeException unavailable) { log.warn("Notification publication unavailable"); }
    }
}
