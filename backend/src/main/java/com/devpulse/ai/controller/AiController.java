package com.devpulse.ai.controller;

import com.devpulse.ai.dto.SuggestTagsRequest;
import com.devpulse.ai.dto.SuggestTagsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * REST controller exposing AI-powered features.
 *
 * <p>Available routes:
 * <ul>
 *   <li>{@code POST /ai/suggest-tags} — suggest tags for post content via AI API</li>
 * </ul>
 */
@Tag(name = "AI", description = "AI-powered features: automatic tag suggestions")
@RestController
@RequestMapping("/ai")
@SecurityRequirement(name = "bearerAuth")
public class AiController {

    @Operation(
            summary = "Suggest tags for post content",
            description = "Sends the provided content to the configured AI provider and returns a ranked list "
                    + "of tag suggestions. Requires authentication to prevent abuse. "
                    + "Falls back to keyword extraction if the AI provider is unavailable."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Tag suggestions returned"),
        @ApiResponse(responseCode = "400", description = "Validation error — content too short or too long"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "503", description = "AI provider unavailable and fallback also failed")
    })
    @PostMapping("/suggest-tags")
    public SuggestTagsResponse suggestTags(@Valid @RequestBody SuggestTagsRequest request) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }
}
