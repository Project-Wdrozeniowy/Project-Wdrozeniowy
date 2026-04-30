package com.devpulse.forum.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Forum category")
public class CategoryDto {

    @Schema(description = "Category ID", example = "1")
    private Long id;

    @Schema(description = "Category name", example = "General Discussion")
    private String name;

    @Schema(description = "URL slug", example = "general-discussion")
    private String slug;

    @Schema(description = "Category description")
    private String description;

    @Schema(description = "Display order for sorting", example = "1")
    private Integer displayOrder;

    @Schema(description = "Whether the category is visible to regular users")
    private boolean visible;

    @Schema(description = "Creation timestamp")
    private OffsetDateTime createdAt;
}
