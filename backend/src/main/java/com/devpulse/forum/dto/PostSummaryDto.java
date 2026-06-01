package com.devpulse.forum.dto;

import com.devpulse.user.dto.UserSummaryDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;

@Getter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Compact post representation used in listing endpoints")
public class PostSummaryDto {

    @Schema(description = "Post ID", example = "101")
    private Long id;

    @Schema(description = "Post title", example = "How to use Spring Boot with PostgreSQL")
    private String title;

    @Schema(description = "URL slug", example = "how-to-use-spring-boot-with-postgresql")
    private String slug;

    @Schema(description = "Post status", example = "PUBLISHED", allowableValues = {"PUBLISHED", "DRAFT", "LOCKED", "DELETED"})
    private String status;

    @Schema(description = "Whether the post is pinned at the top")
    private boolean pinned;

    @Schema(description = "Number of views")
    private int viewCount;

    @Schema(description = "Cumulative vote score")
    private int voteScore;

    @Schema(description = "Number of comments")
    private int commentCount;

    @Schema(description = "Category this post belongs to")
    private CategoryDto category;

    @Schema(description = "Post author")
    private UserSummaryDto author;

    @Schema(description = "Timestamp of the last activity (new comment, edit, etc.)")
    private OffsetDateTime lastActivityAt;

    @Schema(description = "Creation timestamp")
    private OffsetDateTime createdAt;
}
