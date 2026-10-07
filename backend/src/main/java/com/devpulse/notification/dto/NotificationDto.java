package com.devpulse.notification.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "User notification")
public class NotificationDto {

    @Schema(description = "Notification ID", example = "200")
    private Long id;

    @Schema(description = "Sender username (null for system notifications)")
    private String senderUsername;

    @Schema(description = "Notification type", example = "COMMENT_ON_POST",
            allowableValues = {"COMMENT_ON_POST", "REPLY_TO_COMMENT", "VOTE_ON_POST",
                    "VOTE_ON_COMMENT", "MENTION", "POST_LOCKED", "SYSTEM"})
    private String type;

    @Schema(description = "Type of entity the notification relates to", example = "POST", allowableValues = {"POST", "COMMENT"})
    private String entityType;

    @Schema(description = "ID of the related entity", example = "101")
    private Long entityId;

    @Schema(description = "Human-readable notification message")
    private String message;

    @Schema(description = "Whether the notification has been read")
    private boolean read;

    @Schema(description = "Creation timestamp")
    private OffsetDateTime createdAt;
}
