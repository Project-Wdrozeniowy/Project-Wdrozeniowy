package com.devpulse.forum.dto;

import com.devpulse.common.validation.ValidationPatterns;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "Request body for creating a forum category")
public class CreateCategoryRequest {

    @NotBlank(message = "Name must not be blank")
    @Size(max = 100, message = "Name must be at most {max} characters")
    @Schema(description = "Category name, unique ignoring case; surrounding whitespace is removed",
            example = "General Discussion")
    private String name;

    @NotBlank(message = "Slug must not be blank")
    @Size(max = 100, message = "Slug must be at most {max} characters")
    @Pattern(regexp = ValidationPatterns.SLUG,
            message = "Slug must be lower-case letters and digits joined by single hyphens")
    @Schema(description = "URL slug, unique", example = "general-discussion")
    private String slug;

    @Size(max = 1000, message = "Description must be at most {max} characters")
    @Schema(description = "Optional description; a blank one is stored as none")
    private String description;

    @Min(value = 0, message = "Display order must be at least {value}")
    @Schema(description = "Position in the category list, lowest first; 0 when omitted", example = "1")
    private Integer displayOrder;

    @Schema(description = "Whether the category is visible to users", defaultValue = "true")
    private boolean visible = true;
}
