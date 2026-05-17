package com.devpulse.forum.controller;

import com.devpulse.forum.dto.CreatePostRequest;
import com.devpulse.forum.dto.PostResponse;
import com.devpulse.forum.dto.UpdatePostRequest;
import com.devpulse.forum.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
