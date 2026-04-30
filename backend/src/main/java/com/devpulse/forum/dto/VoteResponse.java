package com.devpulse.forum.dto;

import com.devpulse.forum.enums.VoteEntityType;
import com.devpulse.forum.enums.VoteType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Result of casting a vote")
public class VoteResponse {

    @Schema(description = "Vote record ID", example = "9")
    private Long id;

    @Schema(description = "Entity type that was voted on")
    private VoteEntityType entityType;

    @Schema(description = "ID of the entity that was voted on", example = "101")
    private Long entityId;

    @Schema(description = "Vote direction")
    private VoteType voteType;

    @Schema(description = "Updated vote score of the entity after this vote")
    private int newScore;

    @Schema(description = "Timestamp when the vote was cast")
    private OffsetDateTime createdAt;
}
