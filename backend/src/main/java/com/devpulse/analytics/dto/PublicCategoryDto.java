package com.devpulse.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Identity of a category in the public analytics, for drill-down to its posts")
public class PublicCategoryDto {

    @Schema(description = "Category ID; the feed filter GET /forum/posts?categoryId= lists its posts", example = "2")
    private Long id;

    @Schema(description = "URL-friendly identifier", example = "backend")
    private String slug;

    @Schema(description = "Current display name", example = "Backend")
    private String name;

    @Schema(description = "Whether the category is listed on the forum; a hidden category has no category page "
            + "but its public posts still count")
    private boolean visible;
}
