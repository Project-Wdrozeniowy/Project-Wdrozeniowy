package com.devpulse.forum.dto;

import com.devpulse.forum.entity.Category;
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

    /** Builds the DTO of {@code category}, or returns {@code null} for an uncategorised post. */
    public static CategoryDto from(Category category) {
        if (category == null) {
            return null;
        }
        return CategoryDto.builder()
                .id(category.getId())
                .name(category.getName())
                .slug(category.getSlug())
                .description(category.getDescription())
                .displayOrder(category.getDisplayOrder())
                .visible(Boolean.TRUE.equals(category.getIsVisible()))
                .createdAt(category.getCreatedAt())
                .build();
    }
}
