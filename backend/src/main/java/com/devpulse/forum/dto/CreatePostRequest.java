package com.devpulse.forum.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request payload for {@code POST /forum/posts}.
 */
@Data
@NoArgsConstructor
@Schema(description = "Request body for creating a new post")
public class CreatePostRequest {

    /** Most tags a single post may carry. */
    public static final int MAX_TAGS = 5;

    /** A tag is one or more words of letters and digits joined by single hyphens. */
    public static final String TAG_PATTERN = "[A-Za-z0-9]+(-[A-Za-z0-9]+)*";

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

    @Size(max = MAX_TAGS)
    @Schema(description = "Tag names to attach to the post; stored lower-case, created on first use",
            example = "[\"spring\", \"postgresql\"]")
    private List<@NotBlank @Size(max = 50) @Pattern(regexp = TAG_PATTERN) String> tags;

    @Schema(description = "Post as draft instead of publishing immediately", defaultValue = "false")
    private boolean draft = false;
}
