package com.devpulse.forum.controller;

import com.devpulse.common.dto.PagedResponse;
import com.devpulse.forum.dto.CreatePostRequest;
import com.devpulse.forum.dto.PostDto;
import com.devpulse.forum.dto.PostSummaryDto;
import com.devpulse.forum.dto.UpdatePostRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@Tag(name = "Forum – Posts", description = "Browse and manage forum posts")
@RestController
@RequestMapping("/forum/posts")
public class PostController {

    @Operation(summary = "List posts with optional filtering and pagination")
    @ApiResponse(responseCode = "200", description = "Posts returned")
    @GetMapping
    public PagedResponse<PostSummaryDto> listPosts(
            @Parameter(description = "Page number (0-based)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size", example = "20") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Filter by category slug") @RequestParam(required = false) String categorySlug,
            @Parameter(description = "Filter by tag") @RequestParam(required = false) String tag,
            @Parameter(description = "Sort field", schema = @Schema(type = "string", allowableValues = {"createdAt", "voteScore", "lastActivityAt"}, defaultValue = "lastActivityAt"))
                @RequestParam(defaultValue = "lastActivityAt") String sort,
            @Parameter(description = "Full-text search query") @RequestParam(required = false) String q) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Create a new post", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Post created"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "404", description = "Category not found")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostDto createPost(@Valid @RequestBody CreatePostRequest request) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Get a post by slug")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Post found"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @GetMapping("/{slug}")
    public PostDto getPost(
            @Parameter(description = "Post slug", example = "how-to-use-spring-boot-with-postgresql")
            @PathVariable String slug) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Update a post by slug", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Post updated"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "403", description = "Not the author or insufficient role"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @PatchMapping("/{slug}")
    public PostDto updatePost(
            @Parameter(description = "Post slug", example = "how-to-use-spring-boot-with-postgresql") @PathVariable String slug,
            @Valid @RequestBody UpdatePostRequest request) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Delete a post by slug", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Post deleted"),
        @ApiResponse(responseCode = "403", description = "Not the author or insufficient role"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @DeleteMapping("/{slug}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(
            @Parameter(description = "Post slug", example = "how-to-use-spring-boot-with-postgresql") @PathVariable String slug) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Toggle pin status of a post", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Pin status toggled"),
        @ApiResponse(responseCode = "403", description = "Admin or Moderator role required"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @PatchMapping("/{slug}/pin")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    public PostDto togglePin(
            @Parameter(description = "Post slug", example = "how-to-use-spring-boot-with-postgresql") @PathVariable String slug) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }
}
