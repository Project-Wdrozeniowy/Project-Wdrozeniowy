package com.devpulse.forum.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for {@code POST /forum/posts}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request body for creating a new post")
public class CreatePostRequest {

    @NotBlank
    @Size(min = 5, max = 255)
    @Schema(description = "Post title", example = "How to use Spring Boot with PostgreSQL")
    private String title;

    @NotBlank
    @Size(min = 1, max = 50_000)
    @Schema(description = "Post content (Markdown)")
    private String content;

    /** Optional — null means the post is uncategorised. */
    @Schema(description = "ID of the category this post belongs to; omit for an uncategorised post", example = "1")
    private Long categoryId;
}
