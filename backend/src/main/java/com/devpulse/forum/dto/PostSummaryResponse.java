package com.devpulse.forum.dto;

import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * Lightweight projection used for list/search responses.
 *
 * <p>Drops the full {@code content} body to keep list payloads small;
 * clients can follow up with {@code GET /posts/{id}} for the full post.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostSummaryResponse {

    private Long id;
    private String title;
    private String slug;
    private PostStatus status;
    private Boolean isPinned;
    private Integer viewCount;
    private Integer voteScore;
    private Integer commentCount;
    private PostResponse.AuthorSummary author;
    private PostResponse.CategorySummary category;
    private OffsetDateTime createdAt;
    private OffsetDateTime lastActivityAt;

    public static PostSummaryResponse from(Post post) {
        return PostSummaryResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .slug(post.getSlug())
                .status(post.getStatus())
                .isPinned(post.getIsPinned())
                .viewCount(post.getViewCount())
                .voteScore(post.getVoteScore())
                .commentCount(post.getCommentCount())
                .author(PostResponse.AuthorSummary.builder()
                        .id(post.getAuthor().getId())
                        .username(post.getAuthor().getUsername())
                        .build())
                .category(post.getCategory() == null ? null
                        : PostResponse.CategorySummary.builder()
                                .id(post.getCategory().getId())
                                .name(post.getCategory().getName())
                                .slug(post.getCategory().getSlug())
                                .build())
                .createdAt(post.getCreatedAt())
                .lastActivityAt(post.getLastActivityAt())
                .build();
    }
}
