package com.devpulse.recommendation.dto;

import com.devpulse.forum.dto.CategoryDto;
import com.devpulse.forum.entity.Post;
import com.devpulse.forum.entity.Tag;
import com.devpulse.user.dto.UserSummaryDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "A public post recommended to the caller, with the rule that placed it")
public class RecommendedPostDto {

    /** Length of {@link #excerpt}, not counting the ellipsis. */
    public static final int EXCERPT_LENGTH = 200;

    /** {@link #reason} of a post that shares a tag with the caller's interest posts. */
    public static final String SIMILAR_TAGS = "similar_tags";

    /** {@link #reason} of a post in a category of the caller's interest posts. */
    public static final String SAME_CATEGORY = "same_category";

    /** {@link #reason} of a post ranked by recent activity only. */
    public static final String TRENDING = "trending";

    @Schema(description = "Post ID", example = "101")
    private Long id;

    @Schema(description = "Post title")
    private String title;

    @Schema(description = "URL slug")
    private String slug;

    @Schema(description = "The first " + EXCERPT_LENGTH + " characters of the content with whitespace collapsed, "
            + "followed by … when the content is longer")
    private String excerpt;

    @Schema(description = "Vote score")
    private int voteScore;

    @Schema(description = "Comment count")
    private int commentCount;

    @Schema(description = "Post category; null for a post without one", nullable = true)
    private CategoryDto category;

    @Schema(description = "Post author")
    private UserSummaryDto author;

    @Schema(description = "Names of the tags attached to this post, in alphabetical order")
    private List<String> tags;

    @Schema(description = "Rule that placed the post: it shares a tag with posts the caller wrote, upvoted or "
            + "commented on (similar_tags), it is in a category of those posts (same_category), or it is "
            + "ranked by recent activity only (trending)",
            example = TRENDING, allowableValues = {SIMILAR_TAGS, SAME_CATEGORY, TRENDING})
    private String reason;

    @Schema(description = "Post creation timestamp")
    private OffsetDateTime createdAt;

    /** Builds the recommendation of {@code post} placed by {@code reason}. */
    public static RecommendedPostDto from(Post post, String reason) {
        return RecommendedPostDto.builder()
                .id(post.getId())
                .title(post.getTitle())
                .slug(post.getSlug())
                .excerpt(excerpt(post.getContent()))
                .voteScore(post.getVoteScore())
                .commentCount(post.getCommentCount())
                .category(CategoryDto.from(post.getCategory()))
                .author(UserSummaryDto.from(post.getAuthor()))
                .tags(post.getTags().stream().map(Tag::getName).sorted().toList())
                .reason(reason)
                .createdAt(post.getCreatedAt())
                .build();
    }

    static String excerpt(String content) {
        String text = content.strip().replaceAll("\\s+", " ");
        if (text.length() <= EXCERPT_LENGTH) {
            return text;
        }
        return text.substring(0, EXCERPT_LENGTH).stripTrailing() + "…";
    }
}
