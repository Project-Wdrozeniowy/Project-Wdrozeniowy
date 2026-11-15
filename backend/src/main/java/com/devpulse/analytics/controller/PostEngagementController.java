package com.devpulse.analytics.controller;

import com.devpulse.analytics.dto.AuthorPostEngagementDto;
import com.devpulse.analytics.dto.PublicPostEngagementDto;
import com.devpulse.analytics.service.PostEngagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/analytics")
@Tag(name = "Analytics")
@RequiredArgsConstructor
public class PostEngagementController {
    private final PostEngagementService service;

    @GetMapping("/public/posts/{id}")
    @Operation(summary = "Get public engagement of a public post", description = "Published and locked posts only, "
            + "even when called by the author. Draft, deleted and missing posts return the same 404. "
            + "Counts accumulated intentional openings since collection began, reachable visible comments "
            + "and the vote score. Reading statistics never records an opening.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Public engagement returned"),
        @ApiResponse(responseCode = "400", description = "Invalid post ID"),
        @ApiResponse(responseCode = "404", description = "Public post not found")
    })
    public PublicPostEngagementDto publicSummary(@PathVariable long id) {
        return service.publicSummary(id);
    }

    @GetMapping("/me/posts/{id}")
    @Operation(summary = "Get engagement of my post", description = "Author only, including the author's draft. "
            + "A different caller, including staff, gets 404. Deleted and missing posts get 404. "
            + "Includes the UP/DOWN breakdown, never reader identities or visitor rows. "
            + "Reading this summary never records an opening; staff analytics remain a separate API.",
            security = @SecurityRequirement(name = "sessionAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Author engagement returned"),
        @ApiResponse(responseCode = "400", description = "Invalid post ID"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "404", description = "Undeleted post of this author not found")
    })
    public AuthorPostEngagementDto authorSummary(@PathVariable long id) {
        return service.authorSummary(id);
    }
}
