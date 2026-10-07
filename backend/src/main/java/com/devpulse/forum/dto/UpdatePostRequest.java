package com.devpulse.forum.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

import static com.devpulse.forum.dto.CreatePostRequest.MAX_TAGS;
import static com.devpulse.forum.dto.CreatePostRequest.TAG_PATTERN;

/**
 * Request payload for {@code PATCH /forum/posts/{slug}}: fields that are
 * {@code null} stay as they are.
 */
@Data
@NoArgsConstructor
@Schema(description = "Request body for updating a post (all fields optional)")
public class UpdatePostRequest {

    /** Matches any text with at least one non-whitespace character. */
    private static final String NOT_BLANK = "(?s).*\\S.*";

    @Size(max = 255)
    @Pattern(regexp = NOT_BLANK, message = "must not be blank")
    @Schema(description = "New post title")
    private String title;

    @Size(max = 100_000)
    @Pattern(regexp = NOT_BLANK, message = "must not be blank")
    @Schema(description = "New post content (Markdown)")
    private String content;

    @Schema(description = "New category ID")
    private Long categoryId;

    @Size(max = MAX_TAGS)
    @Schema(description = "Replace tags with this list; an empty list removes all tags")
    private List<@NotBlank @Size(max = 50) @Pattern(regexp = TAG_PATTERN) String> tags;

    @Pattern(regexp = "PUBLISHED|DRAFT|LOCKED")
    @Schema(description = "Change post status; LOCKED, and changes to a locked post, are reserved for moderators and admins",
            allowableValues = {"PUBLISHED", "DRAFT", "LOCKED"})
    private String status;
}
