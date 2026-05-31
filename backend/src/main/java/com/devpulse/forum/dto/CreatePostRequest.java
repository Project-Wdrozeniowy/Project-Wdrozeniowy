package com.devpulse.forum.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for {@code POST /posts}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreatePostRequest {

    @NotBlank
    @Size(min = 5, max = 255)
    private String title;

    @NotBlank
    @Size(min = 1, max = 50_000)
    private String content;

    /** Optional — null means the post is uncategorised. */
    private Long categoryId;
}
