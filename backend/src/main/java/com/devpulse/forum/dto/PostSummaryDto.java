package com.devpulse.forum.dto;

import com.devpulse.forum.entity.Post;
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

    /** Builds the listing representation of {@code post}. */
    public static PostSummaryDto from(Post post) {
        return fill(PostSummaryDto.builder(), post).build();
    }

    /** Copies the summary fields of {@code post} into {@code builder}. */
    static <B extends PostSummaryDtoBuilder<?, ?>> B fill(B builder, Post post) {
        builder.id(post.getId())
                .title(post.getTitle())
                .slug(post.getSlug())
                .status(post.getStatus().name())
                .pinned(post.isPinned())
                .viewCount(post.getViewCount())
                .voteScore(post.getVoteScore())
                .commentCount(post.getCommentCount())
                .category(CategoryDto.from(post.getCategory()))
                .author(UserSummaryDto.from(post.getAuthor()))
                .lastActivityAt(post.getLastActivityAt())
                .createdAt(post.getCreatedAt());
        return builder;
    }
}
