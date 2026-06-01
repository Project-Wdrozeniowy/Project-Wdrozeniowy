package com.devpulse.forum.controller;

import com.devpulse.forum.dto.VoteRequest;
import com.devpulse.forum.dto.VoteResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@Tag(name = "Forum – Votes", description = "Cast and retract votes on posts and comments")
@RestController
@RequestMapping("/forum/votes")
public class VoteController {

    @Operation(summary = "Cast a vote on a post or comment", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Vote recorded"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "404", description = "Entity not found"),
        @ApiResponse(responseCode = "409", description = "Already voted on this entity")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VoteResponse castVote(@Valid @RequestBody VoteRequest request) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Retract a vote", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Vote retracted"),
        @ApiResponse(responseCode = "403", description = "Not the owner of this vote"),
        @ApiResponse(responseCode = "404", description = "Vote not found")
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void retractVote(
            @Parameter(description = "Vote ID", example = "9") @PathVariable Long id) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }
}
