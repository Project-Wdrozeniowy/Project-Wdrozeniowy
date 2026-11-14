package com.devpulse.notification.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Where a notification leads, checked against what its recipient may read now.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "The discussion a comment notification leads to, as its recipient may read it now. When it is "
        + "not available, postSlug and commentId are null and unavailableReason says why.")
public class NotificationDestinationDto {

    /** Why a destination cannot be opened. */
    public enum UnavailableReason {
        /** The post was deleted, or is a draft the recipient may not read. */
        POST_UNAVAILABLE,
        /** The comment was deleted, hidden by a moderator, or no longer exists. */
        COMMENT_UNAVAILABLE
    }

    @Schema(description = "Whether the recipient can open the discussion now")
    private boolean available;

    @Schema(description = "Slug of the post to open, GET /forum/posts/{slug}; null when unavailable",
            example = "how-to-use-spring-boot", nullable = true)
    private String postSlug;

    @Schema(description = "ID of the comment to scroll to on that post; null when unavailable", example = "55",
            nullable = true)
    private Long commentId;

    @Schema(description = "Why the destination is unavailable; null when available", nullable = true)
    private UnavailableReason unavailableReason;

    /** A destination the recipient can open. */
    public static NotificationDestinationDto at(String postSlug, Long commentId) {
        return new NotificationDestinationDto(true, postSlug, commentId, null);
    }

    /** A destination the recipient cannot open, without any detail of it. */
    public static NotificationDestinationDto unavailable(UnavailableReason reason) {
        return new NotificationDestinationDto(false, null, null, reason);
    }
}
