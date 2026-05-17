package com.devpulse.forum.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for {@code PUT /posts/{id}} with PATCH-like semantics:
 * only non-{@code null} fields are applied.
 *
 * <p>The {@code categoryId} field cannot reach the DB to clear the category —
 * use the dedicated {@code "clearCategory"} flag for that to keep
 * {@code null} unambiguous ("leave unchanged").
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePostRequest {

    @Size(min = 5, max = 255)
    private String title;

    @Size(min = 1, max = 50_000)
    private String content;

    private Long categoryId;

    /** If {@code true}, the post is detached from any category (overrides {@code categoryId}). */
    private Boolean clearCategory;
}
