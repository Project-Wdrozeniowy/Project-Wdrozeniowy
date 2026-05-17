package com.devpulse.forum.dto;

import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.PostStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * Response payload for post endpoints. Contains a compact author and category
 * summary so the client can render lists without follow-up requests.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostResponse {

    private Long id;
    private String title;
    private String slug;
    private String content;
    private PostStatus status;
    private Boolean isPinned;
    private Integer viewCount;
    private Integer voteScore;
    private Integer commentCount;
    private AuthorSummary author;
    private CategorySummary category;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime lastActivityAt;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AuthorSummary {
        private Long id;
        private String username;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CategorySummary {
        private Long id;
        private String name;
        private String slug;
    }

    /** Builds a {@link PostResponse} from a {@link Post} entity. */
    public static PostResponse from(Post post) {
        AuthorSummary author = AuthorSummary.builder()
                .id(post.getAuthor().getId())
                .username(post.getAuthor().getUsername())
                .build();

        CategorySummary category = post.getCategory() == null ? null
                : CategorySummary.builder()
                        .id(post.getCategory().getId())
                        .name(post.getCategory().getName())
                        .slug(post.getCategory().getSlug())
                        .build();

        return PostResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .slug(post.getSlug())
                .content(post.getContent())
                .status(post.getStatus())
                .isPinned(post.getIsPinned())
                .viewCount(post.getViewCount())
                .voteScore(post.getVoteScore())
                .commentCount(post.getCommentCount())
                .author(author)
                .category(category)
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .lastActivityAt(post.getLastActivityAt())
                .build();
    }
}
