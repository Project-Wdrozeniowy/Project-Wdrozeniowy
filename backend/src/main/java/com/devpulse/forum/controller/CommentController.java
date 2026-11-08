package com.devpulse.forum.controller;

import com.devpulse.common.dto.PagedResponse;
import com.devpulse.forum.dto.CommentDto;
import com.devpulse.forum.dto.CreateCommentRequest;
import com.devpulse.forum.dto.UpdateCommentRequest;
import com.devpulse.forum.service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for comments on forum posts; the rules are documented on
 * {@link CommentService}. Reading is public, every change requires
 * authentication.
 */
@Tag(name = "Forum – Comments", description = "Read and manage comments on forum posts")
@RestController
@RequestMapping("/forum")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    /** Lists the post's root comments with their replies. */
    @Operation(summary = "List comments for a post",
            description = "Pages root comments, oldest first; each comes with its replies down to depth 5. "
                    + "Deleted comments are placeholders without content and author.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Comments returned"),
        @ApiResponse(responseCode = "400", description = "Invalid pagination"),
        @ApiResponse(responseCode = "404", description = "Post not found, deleted, or a draft the caller may not see")
    })
    @GetMapping("/posts/{slug}/comments")
    public PagedResponse<CommentDto> listComments(
            @Parameter(description = "Post slug", example = "how-to-use-spring-boot-with-postgresql") @PathVariable String slug,
            @Parameter(description = "Page number (0-based)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size, 1 to 50", example = "20") @RequestParam(defaultValue = "20") int size) {
        return commentService.list(slug, page, size);
    }

    /** Adds a comment or a reply by the caller. */
    @Operation(summary = "Add a comment to a post",
            description = "With parentId the comment replies to that comment of the same post.",
            security = @SecurityRequirement(name = "sessionAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Comment created"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "403", description = "Post is locked"),
        @ApiResponse(responseCode = "404", description = "Post or parent comment not found"),
        @ApiResponse(responseCode = "409", description = "Post is a draft, or the parent comment was deleted"),
        @ApiResponse(responseCode = "422", description = "Maximum comment nesting depth (5) exceeded")
    })
    @PostMapping("/posts/{slug}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentDto createComment(
            @Parameter(description = "Post slug", example = "how-to-use-spring-boot-with-postgresql") @PathVariable String slug,
            @Valid @RequestBody CreateCommentRequest request) {
        return commentService.create(slug, request);
    }

    /** Replaces the content of a comment. */
    @Operation(summary = "Update a comment", description = "The author or staff.",
            security = @SecurityRequirement(name = "sessionAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Comment updated"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "403", description = "Not the author or staff, or the post is locked"),
        @ApiResponse(responseCode = "404", description = "Comment not found or deleted")
    })
    @PatchMapping("/comments/{id}")
    public CommentDto updateComment(
            @Parameter(description = "Comment ID", example = "55") @PathVariable Long id,
            @Valid @RequestBody UpdateCommentRequest request) {
        return commentService.update(id, request);
    }

    /** Soft-deletes a comment. */
    @Operation(summary = "Delete a comment",
            description = "The author or staff. The comment stays in its thread as a placeholder.",
            security = @SecurityRequirement(name = "sessionAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Comment deleted"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "403", description = "Not the author or staff, or the post is locked"),
        @ApiResponse(responseCode = "404", description = "Comment not found or already deleted")
    })
    @DeleteMapping("/comments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(
            @Parameter(description = "Comment ID", example = "55") @PathVariable Long id) {
        commentService.delete(id);
    }
}
