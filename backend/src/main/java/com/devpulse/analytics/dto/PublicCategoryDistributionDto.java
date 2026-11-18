package com.devpulse.analytics.dto;

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
@Schema(description = "Public posts created in the window by category. The window and the posts counted are "
        + "those of the public activity, so totalPosts equals its totalPosts and the rows add up to it.")
public class PublicCategoryDistributionDto {

    @Schema(description = "Requested window", example = "7d", allowableValues = {"7d", "30d"})
    private String period;

    @Schema(description = "Start of the first UTC day, inclusive", example = "2026-11-05T00:00:00Z")
    private OffsetDateTime windowStart;

    @Schema(description = "Start of the UTC day after the last one, exclusive", example = "2026-11-12T00:00:00Z")
    private OffsetDateTime windowEnd;

    @Schema(description = "When these figures were read; the current UTC day counts up to this moment",
            example = "2026-11-11T14:30:00Z")
    private OffsetDateTime generatedAt;

    @Schema(description = "Public posts created in the window; the denominator of every share", example = "31")
    private long totalPosts;

    @Schema(description = "Every listed category in display order, then by name, with 0 when it has no posts in "
            + "the window; a hidden category only when it has posts in the window. The last row has category "
            + "null and counts the posts without a category; it is always present.")
    private List<PublicCategoryShareDto> categories;
}
