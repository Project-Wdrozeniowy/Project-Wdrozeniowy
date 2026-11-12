package com.devpulse.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Public posts of one category created in the window")
public class PublicCategoryShareDto {

    @Schema(description = "The category; null for posts without a category, including posts whose category "
            + "was deleted", nullable = true)
    private PublicCategoryDto category;

    @Schema(description = "Public posts created in the window", example = "12")
    private long posts;

    @Schema(description = "posts / totalPosts as a fraction from 0 to 1, rounded half up to 4 decimals, so the "
            + "shares can differ from 1 by rounding; null when the window has no public posts",
            example = "0.3871", nullable = true)
    private BigDecimal share;
}
