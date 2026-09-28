package com.devpulse.forum.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for {@code PATCH /forum/posts/{slug}}: only non-{@code null}
 * fields are applied.
 *
 * <p>The {@code categoryId} field cannot reach the DB to clear the category —
 * use the dedicated {@code "clearCategory"} flag for that to keep
 * {@code null} unambiguous ("leave unchanged").
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request body for updating a post (all fields optional)")
public class UpdatePostRequest {

    @Size(min = 5, max = 255)
    @Schema(description = "New post title")
    private String title;

    @Size(min = 1, max = 50_000)
    @Schema(description = "New post content (Markdown)")
    private String content;

    @Schema(description = "New category ID")
    private Long categoryId;

    /** If {@code true}, the post is detached from any category (overrides {@code categoryId}). */
    @Schema(description = "Detach the post from its category (overrides categoryId)")
    private Boolean clearCategory;
}
