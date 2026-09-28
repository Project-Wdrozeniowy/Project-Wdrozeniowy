package com.devpulse.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Platform-wide analytics summary (admin only)")
public class PlatformSummaryDto {

    @Schema(description = "Total registered users")
    private long totalUsers;

    @Schema(description = "Number of active users (ACTIVE status)")
    private long activeUsers;

    @Schema(description = "Total posts")
    private long totalPosts;

    @Schema(description = "Total comments")
    private long totalComments;

    @Schema(description = "Total votes cast")
    private long totalVotes;

    @Schema(description = "Total categories")
    private long totalCategories;

    @Schema(description = "Total tags")
    private long totalTags;
}
