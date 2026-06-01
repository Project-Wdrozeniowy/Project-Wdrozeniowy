package com.devpulse.forum.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@Schema(description = "Request body for updating a post (all fields optional)")
public class UpdatePostRequest {

    @Size(max = 255)
    @Schema(description = "New post title")
    private String title;

    @Schema(description = "New post content (Markdown)")
    private String content;

    @Schema(description = "New category ID")
    private Long categoryId;

    @Schema(description = "Replace tags with this list")
    private List<String> tags;

    @Schema(description = "Change post status", allowableValues = {"PUBLISHED", "DRAFT", "LOCKED"})
    private String status;
}
