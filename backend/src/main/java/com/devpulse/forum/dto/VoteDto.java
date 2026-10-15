package com.devpulse.forum.dto;

import com.devpulse.forum.entity.Vote;
import com.devpulse.forum.enums.VoteEntityType;
import com.devpulse.forum.enums.VoteType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * The caller's vote on a post or comment after {@code POST /forum/votes},
 * with the target's new score.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "The caller's vote after casting it, with the target's new score")
public class VoteDto {

    @Schema(description = "Vote record ID", example = "9")
    private Long id;

    @Schema(description = "Entity type that was voted on")
    private VoteEntityType entityType;

    @Schema(description = "ID of the entity that was voted on", example = "101")
    private Long entityId;

    @Schema(description = "Vote direction")
    private VoteType voteType;

    @Schema(description = "Vote score of the entity after this request")
    private int newScore;

    @Schema(description = "When the vote was first cast")
    private OffsetDateTime createdAt;

    /** Builds the representation of {@code vote}, whose target now has {@code score}. */
    public static VoteDto from(Vote vote, int score) {
        boolean onPost = vote.getPostId() != null;
        return VoteDto.builder()
                .id(vote.getId())
                .entityType(onPost ? VoteEntityType.POST : VoteEntityType.COMMENT)
                .entityId(onPost ? vote.getPostId() : vote.getCommentId())
                .voteType(vote.getVoteType())
                .newScore(score)
                .createdAt(vote.getCreatedAt())
                .build();
    }
}
