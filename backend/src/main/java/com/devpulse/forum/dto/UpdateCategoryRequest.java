package com.devpulse.forum.dto;

import com.devpulse.common.validation.ValidationPatterns;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Changes to a category. Fields left out or {@code null} stay as they are.
 */
@Getter
@NoArgsConstructor
@Schema(description = "Request body for updating a forum category; omitted fields stay as they are")
public class UpdateCategoryRequest {

    @Pattern(regexp = ValidationPatterns.NOT_BLANK, message = "Name must not be blank")
    @Size(max = 100, message = "Name must be at most {max} characters")
    @Schema(description = "New category name, unique ignoring case")
    private String name;

    @Size(max = 100, message = "Slug must be at most {max} characters")
    @Pattern(regexp = ValidationPatterns.SLUG,
            message = "Slug must be lower-case letters and digits joined by single hyphens")
    @Schema(description = "New URL slug, unique; links with the old slug stop working")
    private String slug;

    @Size(max = 1000, message = "Description must be at most {max} characters")
    @Schema(description = "New description; an empty string removes it")
    private String description;

    @Min(value = 0, message = "Display order must be at least {value}")
    @Schema(description = "New position in the category list, lowest first")
    private Integer displayOrder;

    @Schema(description = "Show or hide the category; hidden categories are left out of the public reads")
    private Boolean visible;
}
