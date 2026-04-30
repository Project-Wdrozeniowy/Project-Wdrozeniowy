package com.devpulse.forum.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Full post details — extends PostSummaryDto with content, tags and updatedAt")
public class PostDto extends PostSummaryDto {

    @Schema(description = "Full post content (Markdown)")
    private String content;

    @Schema(description = "Tags attached to this post")
    private List<TagDto> tags;

    @Schema(description = "Last update timestamp")
    private OffsetDateTime updatedAt;
}
