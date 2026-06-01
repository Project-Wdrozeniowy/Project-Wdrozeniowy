package com.devpulse.forum.dto;

import com.devpulse.forum.enums.VoteEntityType;
import com.devpulse.forum.enums.VoteType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "Request body for casting a vote on a post or comment")
public class VoteRequest {

    @NotNull
    @Schema(description = "Type of entity being voted on")
    private VoteEntityType entityType;

    @NotNull
    @Schema(description = "ID of the entity being voted on", example = "101")
    private Long entityId;

    @NotNull
    @Schema(description = "Vote direction")
    private VoteType voteType;
}
