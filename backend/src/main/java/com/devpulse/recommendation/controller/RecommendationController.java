package com.devpulse.recommendation.controller;

import com.devpulse.forum.dto.TagDto;
import com.devpulse.recommendation.dto.RecommendedPostDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Tag(name = "Recommendations", description = "Content recommendations based on activity and trends")
@RestController
@RequestMapping("/recommendations")
@Validated
public class RecommendationController {

    @Operation(summary = "Get recommended posts (personalised for authenticated users, trending for anonymous)")
    @ApiResponse(responseCode = "200", description = "Recommended posts returned")
    @GetMapping("/posts")
    public List<RecommendedPostDto> getRecommendedPosts(
            @Parameter(description = "Number of recommendations to return (1–100)", example = "10")
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int limit) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Get recommended / trending tags")
    @ApiResponse(responseCode = "200", description = "Tag list returned")
    @GetMapping("/tags")
    public List<TagDto> getRecommendedTags(
            @Parameter(description = "Number of tags to return (1–100)", example = "10")
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int limit) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }
}
