package com.devpulse.forum.controller;

import com.devpulse.forum.dto.TagDto;
import com.devpulse.forum.service.TagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller exposing forum tags; reading is public (configured in
 * {@link com.devpulse.config.SecurityConfig}).
 *
 * <p>There is no posts-by-tag operation here: {@code GET /forum/posts?tag={slug}}
 * already lists the public posts of a tag, with paging, sorting and the other
 * post filters.
 */
@Tag(name = "Forum – Tags", description = "Browse the tags of published posts")
@RestController
@RequestMapping("/forum/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    /** Returns the tags on at least one public post, most used first, then by name. */
    @Operation(
            summary = "List the tags in use, most used first",
            description = "Tags on at least one published post, ordered by postCount descending, then by name. "
                    + "Tags used only by drafts or deleted posts are left out. List a tag's posts with "
                    + "GET /forum/posts?tag={slug}."
    )
    @ApiResponse(responseCode = "200", description = "Tag list returned; empty when no published post has a tag")
    @GetMapping
    public List<TagDto> listTags() {
        return tagService.listInUse();
    }
}
