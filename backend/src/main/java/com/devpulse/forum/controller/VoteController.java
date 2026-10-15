package com.devpulse.forum.controller;

import com.devpulse.forum.dto.VoteDto;
import com.devpulse.forum.dto.VoteRequest;
import com.devpulse.forum.service.VoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for votes on posts and comments; the semantics are
 * documented on {@link VoteService}. Both operations require authentication.
 *
 * <p>These routes replace the {@code POST /api/posts/{id}/vote} toggle of the
 * early design, which no longer exists.
 */
@Tag(name = "Forum – Votes", description = "Cast and retract votes on posts and comments")
@RestController
@RequestMapping("/forum/votes")
@RequiredArgsConstructor
public class VoteController {

    private final VoteService voteService;

    /** Casts, keeps or switches the caller's vote on a post or comment. */
    @Operation(summary = "Cast a vote on a post or comment",
            description = "The first vote on a target answers 201. Voting again in the same direction changes "
                    + "nothing and switching direction moves the score by two; both answer 200 with the "
                    + "caller's vote. Votes are accepted on published posts and visible comments of published posts.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Vote recorded"),
        @ApiResponse(responseCode = "200", description = "Existing vote kept or switched"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "403", description = "The post is locked"),
        @ApiResponse(responseCode = "404", description = "Post or comment not found, or not readable by the caller"),
        @ApiResponse(responseCode = "409", description = "The post is a draft, or the vote is being changed concurrently")
    })
    @PostMapping
    public ResponseEntity<VoteDto> castVote(@Valid @RequestBody VoteRequest request) {
        VoteService.CastResult result = voteService.cast(request);
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result.vote());
    }

    /** Retracts one of the caller's votes; the target's score moves back. */
    @Operation(summary = "Retract a vote", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Vote retracted"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "403", description = "The vote belongs to another user"),
        @ApiResponse(responseCode = "404", description = "Vote not found"),
        @ApiResponse(responseCode = "409", description = "The vote is being changed concurrently")
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void retractVote(
            @Parameter(description = "Vote ID", example = "9") @PathVariable Long id) {
        voteService.retract(id);
    }
}
