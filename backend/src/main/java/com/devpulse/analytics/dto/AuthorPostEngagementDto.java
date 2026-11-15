package com.devpulse.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@Schema(description = "Owner-only engagement of an undeleted post, including the owner's draft. No visitor data.")
public record AuthorPostEngagementDto(
        Long postId, long viewCount, long commentCount, int voteScore,
        OffsetDateTime collectedFrom, long upvoteCount, long downvoteCount) {
}
