package com.devpulse.forum.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "Request body for updating a comment")
public class UpdateCommentRequest {

    @NotBlank
    @Size(max = 10_000)
    @Schema(description = "New comment content (Markdown)")
    private String content;
}
