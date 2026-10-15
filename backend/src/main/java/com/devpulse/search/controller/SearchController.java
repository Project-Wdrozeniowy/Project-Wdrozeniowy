package com.devpulse.search.controller;

import com.devpulse.search.dto.SearchResultsDto;
import com.devpulse.search.dto.SearchType;
import com.devpulse.search.service.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for the search across posts, users and tags; the matching
 * and ordering rules are documented on {@link SearchService}.
 */
@Tag(name = "Search", description = "Search posts, users and tags")
@RestController
@RequestMapping("/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    /** Searches posts, users and tags, or one kind of them. */
    @Operation(summary = "Search posts, users and tags",
            description = "Public. Case-insensitive substring match of the trimmed query. Without a type every kind "
                    + "is searched and paged on its own; with a type only that kind is returned and the others are "
                    + "null. A term that matches nothing returns empty pages.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Results returned"),
        @ApiResponse(responseCode = "400", description = "Query shorter than 2 or longer than 100 characters, "
                + "unknown type, or invalid pagination")
    })
    @GetMapping
    public SearchResultsDto search(
            @Parameter(description = "Search term, 2 to 100 characters after trimming", example = "spring")
                @RequestParam(defaultValue = "") String q,
            @Parameter(description = "Return only this kind of result") @RequestParam(required = false) SearchType type,
            @Parameter(description = "Page number of each kind (0-based)", example = "0")
                @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size of each kind, 1 to 50", example = "5")
                @RequestParam(defaultValue = "5") int size) {
        return searchService.search(q, type, page, size);
    }
}
