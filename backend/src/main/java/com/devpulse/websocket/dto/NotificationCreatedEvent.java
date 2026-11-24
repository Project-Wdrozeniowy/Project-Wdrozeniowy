package com.devpulse.websocket.dto;

/** Invalidation only. Current notification contents/destinations are read through REST. */
public record NotificationCreatedEvent(int version, String type, String eventId, Long notificationId) {
    public static NotificationCreatedEvent of(Long id) {
        return new NotificationCreatedEvent(1, "notification.created", "notification.created:" + id, id);
    }
}
