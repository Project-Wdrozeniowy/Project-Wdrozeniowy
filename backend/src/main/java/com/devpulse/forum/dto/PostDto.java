package com.devpulse.forum.dto;

import com.devpulse.forum.entity.Post;
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
@Schema(description = "Full post details — extends PostSummaryDto with content, updatedAt and the subscription")
public class PostDto extends PostSummaryDto {

    @Schema(description = "Full post content (Markdown)")
    private String content;

    @Schema(description = "Last update timestamp")
    private OffsetDateTime updatedAt;

    @Schema(description = "Whether the caller is subscribed to new comments on this post; false for anonymous callers")
    private boolean subscribed;

    /**
     * Builds the full representation of {@code post}, including content, tags,
     * the caller's vote and whether the caller is subscribed to it.
     */
    public static PostDto from(Post post, MyVoteDto myVote, boolean subscribed) {
        return fill(PostDto.builder(), post, myVote)
                .content(post.getContent())
                .tags(TagDto.sorted(post.getTags()))
                .updatedAt(post.getUpdatedAt())
                .subscribed(subscribed)
                .build();
    }
}
