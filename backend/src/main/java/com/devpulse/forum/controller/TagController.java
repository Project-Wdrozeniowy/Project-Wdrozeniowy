package com.devpulse.forum.controller;

import com.devpulse.common.dto.PagedResponse;
import com.devpulse.forum.dto.PostSummaryDto;
import com.devpulse.forum.dto.TagDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Tag(name = "Forum – Tags", description = "Browse tags and tag-filtered posts")
@RestController
@RequestMapping("/forum/tags")
public class TagController {

    @Operation(summary = "List all tags sorted by post count")
    @ApiResponse(responseCode = "200", description = "Tag list returned")
    @GetMapping
    public List<TagDto> listTags() {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "List posts with a specific tag")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Posts returned"),
        @ApiResponse(responseCode = "404", description = "Tag not found")
    })
    @GetMapping("/{slug}/posts")
    public PagedResponse<PostSummaryDto> listPostsByTag(
            @Parameter(description = "Tag slug", example = "spring-boot") @PathVariable String slug,
            @Parameter(description = "Page number (0-based)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size", example = "20") @RequestParam(defaultValue = "20") int size) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }
}
