package com.devpulse.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@Schema(description = "Public engagement of a currently published or locked post. No reader identities.")
public record PublicPostEngagementDto(
        Long postId,
        @Schema(description = "Accumulated intentional openings since collection began; safe reads add none") long viewCount,
        @Schema(description = "Reachable visible comments, excluding hidden branches and deleted placeholders") long commentCount,
        @Schema(description = "Upvotes minus downvotes") int voteScore,
        @Schema(description = "Existing collection cutoff for intentional openings") OffsetDateTime collectedFrom) {
}
