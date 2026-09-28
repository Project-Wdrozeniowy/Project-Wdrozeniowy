package com.devpulse.forum.dto;

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
@Schema(description = "Comment on a forum post, optionally with nested replies")
public class CommentDto {

    @Schema(description = "Comment ID", example = "55")
    private Long id;

    @Schema(description = "ID of the post this comment belongs to", example = "101")
    private Long postId;

    @Schema(description = "ID of the parent comment (null for root comments)")
    private Long parentId;

    @Schema(description = "Comment content (Markdown)")
    private String content;

    @Schema(description = "Comment status", example = "VISIBLE", allowableValues = {"VISIBLE", "HIDDEN", "DELETED"})
    private String status;

    @Schema(description = "Cumulative vote score")
    private int voteScore;

    @Schema(description = "Nesting depth (0 = root comment, maximum allowed depth is 5)")
    private int depth;

    @Schema(description = "Comment author")
    private UserSummaryDto author;

    @Schema(description = "Direct replies to this comment. Populated only for root comments (depth=0) "
            + "in list responses. Maximum nesting depth is 5.")
    private List<CommentDto> replies;

    @Schema(description = "Creation timestamp")
    private OffsetDateTime createdAt;

    @Schema(description = "Last update timestamp")
    private OffsetDateTime updatedAt;
}
