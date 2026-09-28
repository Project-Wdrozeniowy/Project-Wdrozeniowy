package com.devpulse.forum.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@Schema(description = "Request body for creating a new post")
public class CreatePostRequest {

    @NotBlank
    @Size(max = 255)
    @Schema(description = "Post title", example = "How to use Spring Boot with PostgreSQL")
    private String title;

    @NotBlank
    @Size(max = 100_000)
    @Schema(description = "Post content (Markdown)")
    private String content;

    @NotNull
    @Schema(description = "ID of the category this post belongs to", example = "1")
    private Long categoryId;

    @Schema(description = "Tag names to attach to the post", example = "[\"spring\", \"postgresql\"]")
    private List<String> tags;

    @Schema(description = "Post as draft instead of publishing immediately", defaultValue = "false")
    private boolean draft = false;
}
