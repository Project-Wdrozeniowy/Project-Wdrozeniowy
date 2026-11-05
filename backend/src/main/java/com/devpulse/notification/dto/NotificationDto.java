package com.devpulse.notification.dto;

import com.devpulse.notification.entity.Notification;
import com.devpulse.notification.entity.NotificationType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * A notification as its recipient sees it.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "User notification")
public class NotificationDto {

    @Schema(description = "Notification ID", example = "200")
    private Long id;

    @Schema(description = "Sender username; null for system notifications and deleted accounts", nullable = true)
    private String senderUsername;

    @Schema(description = "Notification type", example = "COMMENT_ON_POST")
    private NotificationType type;

    @Schema(description = "Type of entity the notification relates to", example = "POST",
            allowableValues = {"POST", "COMMENT"}, nullable = true)
    private String entityType;

    @Schema(description = "ID of the related entity", example = "101", nullable = true)
    private Long entityId;

    @Schema(description = "Human-readable notification message", nullable = true)
    private String message;

    @Schema(description = "Whether the notification has been read")
    private boolean read;

    @Schema(description = "Creation timestamp")
    private OffsetDateTime createdAt;

    /** Builds the representation of {@code notification}. */
    public static NotificationDto from(Notification notification) {
        return NotificationDto.builder()
                .id(notification.getId())
                .senderUsername(notification.getSender() == null ? null : notification.getSender().getUsername())
                .type(notification.getType())
                .entityType(notification.getEntityType())
                .entityId(notification.getEntityId())
                .message(notification.getMessage())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
