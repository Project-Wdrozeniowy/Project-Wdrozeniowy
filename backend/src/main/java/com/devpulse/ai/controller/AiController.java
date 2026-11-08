package com.devpulse.ai.controller;

import com.devpulse.ai.dto.SuggestTagsRequest;
import com.devpulse.ai.dto.TagSuggestionsDto;
import com.devpulse.ai.service.TagSuggestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * AI-assisted features for signed-in users; see {@link TagSuggestionService}
 * for how suggestions are chosen and when the AI provider is used.
 */
@Tag(name = "AI", description = "AI-assisted features: tag suggestions")
@RestController
@RequestMapping("/ai")
@SecurityRequirement(name = "sessionAuth")
@RequiredArgsConstructor
public class AiController {

    private final TagSuggestionService tagSuggestionService;

    /** Suggests tags for post content; signed-in users only. */
    @Operation(
            summary = "Suggest tags for post content",
            description = "Signed-in users only. When an AI provider is configured, the model chooses up to 5 of "
                    + "the 200 most used tags (aiGenerated: true). Otherwise, or when the provider fails or chooses "
                    + "none, tags come from the words of the title and content (aiGenerated: false): existing tags "
                    + "whose words appear first, then frequent words. Title words count three times."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Tag suggestions, best first; empty when nothing fits"),
        @ApiResponse(responseCode = "400", description = "Validation error; errors names the fields"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "503", description = "Neither the AI provider nor the keyword extraction "
                + "could answer")
    })
    @PostMapping("/suggest-tags")
    public TagSuggestionsDto suggestTags(@Valid @RequestBody SuggestTagsRequest request) {
        return tagSuggestionService.suggest(request);
    }
}
