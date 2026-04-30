package com.devpulse.forum.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "Request body for updating a forum category (all fields optional)")
public class UpdateCategoryRequest {

    @Size(max = 100)
    @Schema(description = "New category name")
    private String name;

    @Size(max = 100)
    @Schema(description = "New URL slug")
    private String slug;

    @Schema(description = "New description")
    private String description;

    @Schema(description = "New display order")
    private Integer displayOrder;

    @Schema(description = "Change visibility")
    private Boolean visible;
}
