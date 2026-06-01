package com.devpulse.forum.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "Request body for creating a comment")
public class CreateCommentRequest {

    @NotBlank
    @Size(max = 10_000)
    @Schema(description = "Comment content (Markdown)")
    private String content;

    @Schema(description = "ID of the parent comment for threaded replies (omit for root comment)")
    private Long parentId;
}
