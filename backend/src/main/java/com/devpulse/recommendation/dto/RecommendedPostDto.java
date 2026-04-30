package com.devpulse.recommendation.dto;

import com.devpulse.forum.dto.CategoryDto;
import com.devpulse.user.dto.UserSummaryDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "A post recommended to the user based on their activity and preferences")
public class RecommendedPostDto {

    @Schema(description = "Post ID", example = "101")
    private Long id;

    @Schema(description = "Post title")
    private String title;

    @Schema(description = "URL slug")
    private String slug;

    @Schema(description = "Brief excerpt from the post content")
    private String excerpt;

    @Schema(description = "Vote score")
    private int voteScore;

    @Schema(description = "Comment count")
    private int commentCount;

    @Schema(description = "Post category")
    private CategoryDto category;

    @Schema(description = "Post author")
    private UserSummaryDto author;

    @Schema(description = "Tags attached to this post")
    private List<String> tags;

    @Schema(description = "Reason this post was recommended", example = "trending", allowableValues = {"trending", "similar_tags", "same_category", "personalized"})
    private String reason;

    @Schema(description = "Post creation timestamp")
    private OffsetDateTime createdAt;
}
