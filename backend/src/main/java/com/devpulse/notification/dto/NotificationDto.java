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

    @Schema(description = "Where COMMENT_ON_POST and REPLY_TO_COMMENT notifications lead, checked when read; "
            + "null for other types", nullable = true)
    private NotificationDestinationDto destination;

    /** Builds the representation of {@code notification} with its {@code destination}, which may be null. */
    public static NotificationDto from(Notification notification, NotificationDestinationDto destination) {
        return NotificationDto.builder()
                .id(notification.getId())
                .senderUsername(notification.getSender() == null ? null : notification.getSender().getUsername())
                .type(notification.getType())
                .entityType(notification.getEntityType())
                .entityId(notification.getEntityId())
                .message(notification.getMessage())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .destination(destination)
                .build();
    }
}
