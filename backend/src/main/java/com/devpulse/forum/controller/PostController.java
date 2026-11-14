package com.devpulse.forum.controller;

import com.devpulse.common.dto.PagedResponse;
import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.CreatePostRequest;
import com.devpulse.forum.dto.PostDto;
import com.devpulse.forum.dto.PostSummaryDto;
import com.devpulse.forum.dto.RecordPostOpeningRequest;
import com.devpulse.forum.dto.UpdatePostRequest;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.service.PostFilter;
import com.devpulse.forum.service.PostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * REST controller exposing forum post endpoints.
 *
 * <p>Read endpoints are accessible to everyone (configured as public in
 * {@link com.devpulse.config.SecurityConfig}); write endpoints require an
 * authenticated user, with ownership/role checks enforced in
 * {@link PostService}.
 */
@Tag(name = "Forum – Posts", description = "Browse and manage forum posts")
@RestController
@RequestMapping("/forum/posts")
@RequiredArgsConstructor
public class PostController {

    /** Sort fields allowed by the API contract; results are always ordered newest / highest first. */
    private static final Set<String> SORT_FIELDS = Set.of("createdAt", "voteScore", "lastActivityAt");

    private static final int MAX_PAGE_SIZE = 100;

    private final PostService postService;

    /**
     * Returns posts matching the search and filter criteria.
     *
     * <p>All query parameters are optional. Without {@code q}, pinned posts
     * come first; a search is ordered by the sort field only. The
     * {@code status} parameter is ignored unless the caller may see posts in
     * that status (see {@link PostService#search}).
     *
     * <p>Pagination defaults: size 20, sorted by {@code lastActivityAt} descending.
     */
    @Operation(summary = "List posts with optional filtering and pagination",
            description = "Public. Without a status filter only published and locked posts are listed. "
                    + "A bearer token is optional and only widens what the status filter may return. "
                    + "createdFrom (inclusive) and createdTo (exclusive) bound the creation time and, with "
                    + "categoryId or uncategorized=true, list the posts behind a public analytics figure: "
                    + "for the activity row of 2026-11-05 pass createdFrom=2026-11-05T00:00:00Z and "
                    + "createdTo=2026-11-06T00:00:00Z; for a category row of a window pass its windowStart, "
                    + "windowEnd and category.id, or uncategorized=true for the row without a category.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Posts returned"),
        @ApiResponse(responseCode = "400", description = "Invalid pagination, unsupported sort field, an invalid "
                + "or empty creation range, or uncategorized combined with a category filter")
    })
    @GetMapping
    public PagedResponse<PostSummaryDto> listPosts(
            @Parameter(description = "Page number (0-based)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size", example = "20") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Case-insensitive text search in title and content") @RequestParam(required = false) String q,
            @Parameter(description = "Filter by category id") @RequestParam(required = false) Long categoryId,
            @Parameter(description = "Filter by category slug") @RequestParam(required = false) String categorySlug,
            @Parameter(description = "Filter by tag slug") @RequestParam(required = false) String tag,
            @Parameter(description = "Filter by author username") @RequestParam(required = false) String author,
            @Parameter(description = "Filter by status. PUBLISHED and LOCKED work for everyone, DELETED for moderators "
                    + "and admins, DRAFT for admins or for your own drafts together with author=<your username>; "
                    + "a status the caller may not see is ignored")
                @RequestParam(required = false) PostStatus status,
            @Parameter(description = "Sort field", schema = @Schema(type = "string", allowableValues = {"createdAt", "voteScore", "lastActivityAt"}, defaultValue = "lastActivityAt"))
                @RequestParam(defaultValue = "lastActivityAt") String sort,
            @Parameter(description = "Only posts created at or after this instant (ISO-8601, e.g. "
                    + "2026-11-05T00:00:00Z); inclusive", example = "2026-11-05T00:00:00Z")
                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                OffsetDateTime createdFrom,
            @Parameter(description = "Only posts created before this instant (ISO-8601); exclusive, and after "
                    + "createdFrom when both are given", example = "2026-11-06T00:00:00Z")
                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                OffsetDateTime createdTo,
            @Parameter(description = "true lists only posts without a category, including those whose category "
                    + "was deleted; cannot be combined with categoryId or categorySlug")
                @RequestParam(defaultValue = "false") boolean uncategorized) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new AppException("page must be >= 0 and size between 1 and " + MAX_PAGE_SIZE,
                    HttpStatus.BAD_REQUEST);
        }
        if (!SORT_FIELDS.contains(sort)) {
            throw new AppException("Unsupported sort field: " + sort, HttpStatus.BAD_REQUEST);
        }
        if (createdFrom != null && createdTo != null && !createdFrom.isBefore(createdTo)) {
            throw new AppException("createdFrom must be before createdTo", HttpStatus.BAD_REQUEST);
        }
        if (uncategorized && (categoryId != null || StringUtils.hasText(categorySlug))) {
            throw new AppException("uncategorized cannot be combined with categoryId or categorySlug",
                    HttpStatus.BAD_REQUEST);
        }
        List<Sort.Order> orders = new ArrayList<>();
        if (!StringUtils.hasText(q)) {
            orders.add(Sort.Order.desc("pinned"));
        }
        orders.add(Sort.Order.desc(sort));
        // Tie-breaker, so pages don't overlap or skip posts with equal sort values.
        orders.add(Sort.Order.desc("id"));

        PostFilter filter = new PostFilter(q, categoryId, categorySlug, tag, author, status,
                createdFrom, createdTo, uncategorized);
        return PagedResponse.from(postService.search(filter, PageRequest.of(page, size, Sort.by(orders))));
    }

    /** Creates a new post, published or as a draft. */
    @Operation(summary = "Create a new post", security = @SecurityRequirement(name = "sessionAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Post created"),
        @ApiResponse(responseCode = "400", description = "Validation error or unknown category"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostDto createPost(@Valid @RequestBody CreatePostRequest request) {
        return postService.create(request);
    }

    /** Returns the post identified by slug. */
    @Operation(summary = "Get a post by slug",
            description = "Public. A draft is visible only to its author and to admins, who need to send their bearer token.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Post found"),
        @ApiResponse(responseCode = "404", description = "Not found, deleted, or a draft the caller may not see")
    })
    @GetMapping("/{slug}")
    public PostDto getPost(
            @Parameter(description = "Post slug", example = "how-to-use-spring-boot-with-postgresql")
            @PathVariable String slug) {
        return postService.getBySlug(slug);
    }

    /** Counts one intentional opening of a post. */
    @Operation(summary = "Record that a reader opened a post",
            description = "Public, for guests and members. Call it after the post was actually shown to the reader, "
                    + "not for prefetches or background refreshes; reading a post counts nothing by itself. "
                    + "Create a new openingId for each opening and reuse it only to retry that opening: the same "
                    + "openingId is counted once and is safe to retry for at least 24 hours. Answers 204 whether "
                    + "or not this delivery was the one counted.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Opening counted, or already counted"),
        @ApiResponse(responseCode = "400", description = "openingId is missing or not a UUID"),
        @ApiResponse(responseCode = "404", description = "Not found, deleted, or a draft the caller may not see")
    })
    @PostMapping("/{slug}/openings")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void recordOpening(
            @Parameter(description = "Post slug", example = "how-to-use-spring-boot-with-postgresql")
            @PathVariable String slug,
            @Valid @RequestBody RecordPostOpeningRequest request) {
        postService.recordOpening(slug, request.getOpeningId());
    }

    /** Updates an existing post (author or staff). Only non-null fields are applied. */
    @Operation(summary = "Update a post by slug", security = @SecurityRequirement(name = "sessionAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Post updated"),
        @ApiResponse(responseCode = "400", description = "Validation error or unknown category"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Not the author, the post is locked, or locking requires a moderator"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @PatchMapping("/{slug}")
    public PostDto updatePost(
            @Parameter(description = "Post slug", example = "how-to-use-spring-boot-with-postgresql") @PathVariable String slug,
            @Valid @RequestBody UpdatePostRequest request) {
        return postService.update(slug, request);
    }

    /** Soft-deletes a post (author or staff). */
    @Operation(summary = "Delete a post by slug", security = @SecurityRequirement(name = "sessionAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Post deleted"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Not the author, or the post is locked"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @DeleteMapping("/{slug}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(
            @Parameter(description = "Post slug", example = "how-to-use-spring-boot-with-postgresql") @PathVariable String slug) {
        postService.delete(slug);
    }

    /** Pins or unpins a post (moderators and admins). */
    @Operation(summary = "Toggle pin status of a post", security = @SecurityRequirement(name = "sessionAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Pin status toggled"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Admin or Moderator role required"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @PatchMapping("/{slug}/pin")
    public PostDto togglePin(
            @Parameter(description = "Post slug", example = "how-to-use-spring-boot-with-postgresql") @PathVariable String slug) {
        return postService.togglePin(slug);
    }
}
