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
@Schema(description = "Analytics data for a single forum post")
public class PostAnalyticsDto {

    @Schema(description = "Post ID", example = "101")
    private Long postId;

    @Schema(description = "Post title")
    private String postTitle;

    @Schema(description = "Total view count")
    private int viewCount;

    @Schema(description = "Signed-in readers who opened the post since uniqueViewCountSince; guests are not "
            + "counted. Openings keep their reader only for the retention of opening details, so this is not "
            + "an all-time figure")
    private int uniqueViewCount;

    @Schema(description = "Start of the period uniqueViewCount covers: the later of the retention cutoff of "
            + "opening details and the start of opening collection", example = "2026-10-16T12:00:00Z")
    private OffsetDateTime uniqueViewCountSince;

    @Schema(description = "Total comment count")
    private int commentCount;

    @Schema(description = "Vote score (upvotes minus downvotes)")
    private int voteScore;

    @Schema(description = "Number of upvotes")
    private int upvoteCount;

    @Schema(description = "Number of downvotes")
    private int downvoteCount;

    @Schema(description = "Number of active subscriptions to this post")
    private int subscriptionCount;
}
