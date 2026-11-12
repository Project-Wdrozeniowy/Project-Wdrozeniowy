package com.devpulse.analytics.controller;

import com.devpulse.analytics.dto.ActivityTrendDto;
import com.devpulse.analytics.dto.PostAnalyticsDto;
import com.devpulse.analytics.dto.PlatformSummaryDto;
import com.devpulse.analytics.dto.PublicActivityComparisonDto;
import com.devpulse.analytics.dto.PublicActivityDto;
import com.devpulse.analytics.dto.PublicCategoryDistributionDto;
import com.devpulse.analytics.dto.UserActivitySummaryDto;
import com.devpulse.analytics.service.AnalyticsService;
import com.devpulse.forum.dto.PostSummaryDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for activity and engagement analytics; how each figure is
 * counted is documented on {@link AnalyticsService}. Trending posts and the
 * public figures are open to guests, everything else needs authentication.
 */
@Tag(name = "Analytics", description = "Activity and engagement analytics")
@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @Operation(summary = "Get own activity summary", security = @SecurityRequirement(name = "sessionAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Summary returned"),
        @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    @GetMapping("/me")
    public UserActivitySummaryDto getMyActivitySummary() {
        return analyticsService.myActivity();
    }

    @Operation(summary = "Get analytics for a specific post", security = @SecurityRequirement(name = "sessionAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Post analytics returned"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "403", description = "Admin or Moderator role required"),
        @ApiResponse(responseCode = "404", description = "Post not found")
    })
    @GetMapping("/posts/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    public PostAnalyticsDto getPostAnalytics(
            @Parameter(description = "Post ID", example = "101") @PathVariable Long id) {
        return analyticsService.postAnalytics(id);
    }

    @Operation(summary = "Get platform-wide summary", security = @SecurityRequirement(name = "sessionAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Summary returned"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "403", description = "Admin role required")
    })
    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public PlatformSummaryDto getPlatformSummary() {
        return analyticsService.platformSummary();
    }

    @Operation(summary = "Get activity trend for a metric over a period",
            description = "Daily counts (UTC) of the rows created for the chosen metric within the period; "
                    + "days without rows count 0.",
            security = @SecurityRequirement(name = "sessionAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Trend data returned"),
        @ApiResponse(responseCode = "400", description = "Invalid metric or period"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "403", description = "Admin role required")
    })
    @GetMapping("/trends")
    @PreAuthorize("hasRole('ADMIN')")
    public ActivityTrendDto getActivityTrend(
            @Parameter(description = "Metric to track", example = "posts",
                    schema = @io.swagger.v3.oas.annotations.media.Schema(allowableValues = {"posts", "comments", "votes", "users"}))
            @RequestParam(defaultValue = "posts") String metric,
            @Parameter(description = "Time period", example = "7d",
                    schema = @io.swagger.v3.oas.annotations.media.Schema(allowableValues = {"24h", "7d", "30d", "90d"}))
            @RequestParam(defaultValue = "7d") String period) {
        return analyticsService.trend(metric, period);
    }

    @Operation(summary = "Get trending posts for a time window",
            description = "Public. The most active published or locked posts within the window, ranked by "
                    + "views + 2 x votes + 3 x comments in the window; posts without activity are left out.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Trending posts returned"),
        @ApiResponse(responseCode = "400", description = "Invalid period or limit")
    })
    @GetMapping("/trending-posts")
    public List<PostSummaryDto> getTrendingPosts(
            @Parameter(description = "Time window", example = "24h",
                    schema = @io.swagger.v3.oas.annotations.media.Schema(allowableValues = {"24h", "7d", "30d"}))
            @RequestParam(defaultValue = "24h") String period,
            @Parameter(description = "Maximum number of results (1–50)", example = "10")
            @RequestParam(defaultValue = "10") int limit) {
        return analyticsService.trendingPosts(period, limit);
    }

    @Operation(summary = "Get daily public platform activity",
            description = "Public. Published or locked posts and visible comments on them, per UTC day, for the "
                    + "last 7 or 30 UTC days ending with the current, still partial day. Quiet days are returned "
                    + "with 0. Figures count the records that are public now and were created in the window.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Activity returned"),
        @ApiResponse(responseCode = "400", description = "Invalid period")
    })
    @GetMapping("/public/activity")
    public PublicActivityDto getPublicActivity(
            @Parameter(description = "Number of UTC days", example = "7d",
                    schema = @io.swagger.v3.oas.annotations.media.Schema(allowableValues = {"7d", "30d"}))
            @RequestParam(defaultValue = "7d") String period) {
        return analyticsService.publicActivity(period);
    }

    @Operation(summary = "Get public posts by category",
            description = "Public. The published or locked posts created in the window of the public activity, by "
                    + "their current category, with each category's share. Rows add up to totalPosts; posts "
                    + "without a category, also those whose category was deleted, are the last row.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Distribution returned"),
        @ApiResponse(responseCode = "400", description = "Invalid period")
    })
    @GetMapping("/public/categories")
    public PublicCategoryDistributionDto getPublicCategoryDistribution(
            @Parameter(description = "Number of UTC days", example = "7d",
                    schema = @io.swagger.v3.oas.annotations.media.Schema(allowableValues = {"7d", "30d"}))
            @RequestParam(defaultValue = "7d") String period) {
        return analyticsService.publicCategoryDistribution(period);
    }

    @Operation(summary = "Compare public activity with the previous window",
            description = "Public. Published or locked posts and visible comments on them in the window of the "
                    + "public activity up to now, against the window of the same length that ends where it starts. "
                    + "Gives counts, absolute changes and percentages; the percentage is null when the previous "
                    + "value is 0.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Comparison returned"),
        @ApiResponse(responseCode = "400", description = "Invalid period")
    })
    @GetMapping("/public/comparison")
    public PublicActivityComparisonDto getPublicActivityComparison(
            @Parameter(description = "Number of UTC days in the current window", example = "7d",
                    schema = @io.swagger.v3.oas.annotations.media.Schema(allowableValues = {"7d", "30d"}))
            @RequestParam(defaultValue = "7d") String period) {
        return analyticsService.publicActivityComparison(period);
    }
}
