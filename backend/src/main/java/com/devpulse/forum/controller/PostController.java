package com.devpulse.forum.controller;

import com.devpulse.forum.dto.CreatePostRequest;
import com.devpulse.forum.dto.PagedResponse;
import com.devpulse.forum.dto.PostResponse;
import com.devpulse.forum.dto.PostSummaryResponse;
import com.devpulse.forum.dto.UpdatePostRequest;
import com.devpulse.forum.entity.PostStatus;
import com.devpulse.forum.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller exposing forum post endpoints.
 *
 * <p>Read endpoints are accessible to everyone (configured as public in
 * {@link com.devpulse.config.SecurityConfig}); write endpoints require an
 * authenticated user, with ownership/role checks enforced in
 * {@link PostService}.
 */
@RestController
@RequestMapping("/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    /**
     * Returns posts matching the search and filter criteria.
     *
     * <p>All query parameters are optional. The {@code status} parameter is
     * silently ignored for callers that lack the {@code MODERATOR} or
     * {@code ADMIN} role, who only ever see {@code PUBLISHED} posts.
     *
     * <p>Pagination defaults: size 20, sorted by {@code createdAt} descending.
     */
    @GetMapping
    public PagedResponse<PostSummaryResponse> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String categorySlug,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) PostStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return PagedResponse.from(
                postService.search(q, categoryId, categorySlug, author, status, pageable),
                PostSummaryResponse::from);
    }

    /** Creates a new post. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostResponse create(@Valid @RequestBody CreatePostRequest request) {
        return postService.create(request);
    }

    /** Returns the post identified by numeric id. */
    @GetMapping("/{id}")
    public PostResponse getById(@PathVariable Long id) {
        return postService.getById(id);
    }

    /** Returns the post identified by slug — handy for SEO-friendly URLs. */
    @GetMapping("/slug/{slug}")
    public PostResponse getBySlug(@PathVariable String slug) {
        return postService.getBySlug(slug);
    }

    /** Updates an existing post (author / moderator / admin only). */
    @PutMapping("/{id}")
    public PostResponse update(@PathVariable Long id,
                               @Valid @RequestBody UpdatePostRequest request) {
        return postService.update(id, request);
    }

    /** Soft-deletes a post (author / moderator / admin only). */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        postService.delete(id);
    }
}
