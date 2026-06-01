package com.devpulse.analytics.dto;

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
@Schema(description = "Summary of a user's activity on the platform")
public class UserActivitySummaryDto {

    @Schema(description = "User ID", example = "42")
    private Long userId;

    @Schema(description = "Username", example = "johndoe")
    private String username;

    @Schema(description = "Total posts created")
    private int totalPosts;

    @Schema(description = "Total comments written")
    private int totalComments;

    @Schema(description = "Total votes cast")
    private int totalVotesCast;

    @Schema(description = "Total upvotes received on posts and comments")
    private int totalUpvotesReceived;

    @Schema(description = "Total downvotes received on posts and comments")
    private int totalDownvotesReceived;

    @Schema(description = "Timestamp of the last recorded activity")
    private OffsetDateTime lastActivityAt;
}
