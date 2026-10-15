package com.devpulse.forum.dto;

import com.devpulse.forum.entity.Vote;
import com.devpulse.forum.enums.VoteType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * The caller's own vote on a post, so a client can highlight it and retract
 * it with {@code DELETE /forum/votes/{id}}.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "The caller's vote on this post")
public class MyVoteDto {

    @Schema(description = "Vote ID, for retracting it", example = "9")
    private Long id;

    @Schema(description = "Vote direction")
    private VoteType voteType;

    /** Builds the representation of {@code vote}. */
    public static MyVoteDto from(Vote vote) {
        return new MyVoteDto(vote.getId(), vote.getVoteType());
    }
}
