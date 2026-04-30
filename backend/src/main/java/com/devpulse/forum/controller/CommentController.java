package com.devpulse.forum.controller;

import com.devpulse.common.dto.PagedResponse;
import com.devpulse.forum.dto.CommentDto;
import com.devpulse.forum.dto.CreateCommentRequest;
import com.devpulse.forum.dto.UpdateCommentRequest;
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

@Tag(name = "Forum – Comments", description = "Read and manage comments on forum posts")
@RestController
@RequestMapping("/forum")
public class CommentController {

    @Operation(summary = "List comments for a post (root comments include nested replies up to depth 5)")
    @ApiResponse(responseCode = "200", description = "Comments returned")
    @GetMapping("/posts/{postId}/comments")
    public PagedResponse<CommentDto> listComments(
            @Parameter(description = "Post ID", example = "101") @PathVariable Long postId,
            @Parameter(description = "Page number (0-based)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size", example = "20") @RequestParam(defaultValue = "20") int size) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Add a comment to a post", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Comment created"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "404", description = "Post not found"),
        @ApiResponse(responseCode = "422", description = "Maximum comment nesting depth (5) exceeded")
    })
    @PostMapping("/posts/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentDto createComment(
            @Parameter(description = "Post ID", example = "101") @PathVariable Long postId,
            @Valid @RequestBody CreateCommentRequest request) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Update a comment", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Comment updated"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "403", description = "Not the author or insufficient role"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @PatchMapping("/comments/{id}")
    public CommentDto updateComment(
            @Parameter(description = "Comment ID", example = "55") @PathVariable Long id,
            @Valid @RequestBody UpdateCommentRequest request) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Delete a comment", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Comment deleted"),
        @ApiResponse(responseCode = "403", description = "Not the author or insufficient role"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @DeleteMapping("/comments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(
            @Parameter(description = "Comment ID", example = "55") @PathVariable Long id) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }
}
