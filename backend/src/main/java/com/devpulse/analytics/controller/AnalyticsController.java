package com.devpulse.analytics.controller;

import com.devpulse.analytics.dto.PostAnalyticsDto;
import com.devpulse.analytics.dto.PlatformSummaryDto;
import com.devpulse.analytics.dto.UserActivitySummaryDto;
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
}
