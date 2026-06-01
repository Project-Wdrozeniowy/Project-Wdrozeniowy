package com.devpulse.analytics.controller;

import com.devpulse.analytics.dto.ActivityTrendDto;
import com.devpulse.analytics.dto.PostAnalyticsDto;
import com.devpulse.analytics.dto.PlatformSummaryDto;
import com.devpulse.analytics.dto.UserActivitySummaryDto;
import com.devpulse.forum.dto.PostSummaryDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Tag(name = "Analytics", description = "Activity and engagement analytics")
@RestController
@RequestMapping("/analytics")
@SecurityRequirement(name = "bearerAuth")
public class AnalyticsController {

    @Operation(summary = "Get own activity summary")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Summary returned"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping("/me")
    public UserActivitySummaryDto getMyActivitySummary() {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Get analytics for a specific post")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Post analytics returned"),
        @ApiResponse(responseCode = "403", description = "Admin or Moderator role required"),
        @ApiResponse(responseCode = "404", description = "Post not found")
    })
    @GetMapping("/posts/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    public PostAnalyticsDto getPostAnalytics(
            @Parameter(description = "Post ID", example = "101") @PathVariable Long id) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Get platform-wide summary")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Summary returned"),
        @ApiResponse(responseCode = "403", description = "Admin role required")
    })
    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public PlatformSummaryDto getPlatformSummary() {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Get activity trend for a metric over a period",
            description = "Returns daily counts for the chosen metric. Useful for time-series charts on the admin dashboard.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Trend data returned"),
        @ApiResponse(responseCode = "400", description = "Invalid metric or period"),
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
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Get trending posts for a time window",
            description = "Returns the top posts ranked by a combination of views, votes, and comment activity within the window.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Trending posts returned"),
        @ApiResponse(responseCode = "400", description = "Invalid period")
    })
    @GetMapping("/trending-posts")
    public List<PostSummaryDto> getTrendingPosts(
            @Parameter(description = "Time window", example = "24h",
                    schema = @io.swagger.v3.oas.annotations.media.Schema(allowableValues = {"24h", "7d", "30d"}))
            @RequestParam(defaultValue = "24h") String period,
            @Parameter(description = "Maximum number of results (1–50)", example = "10")
            @RequestParam(defaultValue = "10") int limit) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }
}
