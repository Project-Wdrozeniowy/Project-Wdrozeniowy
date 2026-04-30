package com.devpulse.forum.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "Request body for creating a forum category")
public class CreateCategoryRequest {

    @NotBlank
    @Size(max = 100)
    @Schema(description = "Category name", example = "General Discussion")
    private String name;

    @NotBlank
    @Size(max = 100)
    @Schema(description = "URL slug (must be unique)", example = "general-discussion")
    private String slug;

    @Schema(description = "Optional description")
    private String description;

    @Schema(description = "Display order for sorting", example = "1")
    private Integer displayOrder;

    @Schema(description = "Whether the category is visible to users", defaultValue = "true")
    private boolean visible = true;
}
