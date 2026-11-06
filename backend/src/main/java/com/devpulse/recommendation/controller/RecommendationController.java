package com.devpulse.recommendation.controller;

import com.devpulse.forum.dto.TagDto;
import com.devpulse.recommendation.dto.RecommendedPostDto;
import com.devpulse.recommendation.service.RecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public recommendation endpoints (configured in
 * {@link com.devpulse.config.SecurityConfig}); a signed-in caller gets
 * results built from their own activity. The ranking rules are documented on
 * {@link com.devpulse.recommendation.repository.RecommendationRepository}.
 */
@Tag(name = "Recommendations", description = "Post and tag recommendations from forum activity")
@RestController
@RequestMapping("/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    /** Recommended public posts for the caller, best first. */
    @Operation(
            summary = "Recommend public posts",
            description = "Public. Signed-in callers never get posts they wrote, voted on or commented on. "
                    + "Posts are ordered by: (1) posts sharing a tag with the caller's interest posts (the public "
                    + "posts they wrote, upvoted or commented on), then posts in a category of those posts, then the "
                    + "rest; (2) shared tags, most first; (3) activity in the last 7 days, views + 2 x votes + "
                    + "3 x comments; (4) vote score, newest, highest id. Anonymous callers and callers without "
                    + "activity get order (3)–(4) only.",
            security = {}
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Recommended posts, best first; empty when no post is public"),
        @ApiResponse(responseCode = "400", description = "Limit outside 1–100")
    })
    @GetMapping("/posts")
    public List<RecommendedPostDto> getRecommendedPosts(
            @Parameter(description = "Number of recommendations to return (1–100)", example = "10",
                    schema = @Schema(type = "integer", format = "int32", minimum = "1", maximum = "100",
                            defaultValue = "10"))
            @RequestParam(defaultValue = "10") int limit) {
        return recommendationService.posts(limit);
    }

    /** Recommended tags for the caller, best first. */
    @Operation(
            summary = "Recommend tags",
            description = "Public. Tags of published posts, leaving out the caller's interest tags (the tags of the "
                    + "public posts they wrote, upvoted or commented on). Ordered by: (1) public posts carrying the "
                    + "tag and an interest tag, most first; (2) public posts with the tag created in the last 7 days, "
                    + "most first; (3) postCount, most first, then name.",
            security = {}
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Recommended tags, best first; empty when no published post "
                + "has a tag"),
        @ApiResponse(responseCode = "400", description = "Limit outside 1–100")
    })
    @GetMapping("/tags")
    public List<TagDto> getRecommendedTags(
            @Parameter(description = "Number of tags to return (1–100)", example = "10",
                    schema = @Schema(type = "integer", format = "int32", minimum = "1", maximum = "100",
                            defaultValue = "10"))
            @RequestParam(defaultValue = "10") int limit) {
        return recommendationService.tags(limit);
    }
}
