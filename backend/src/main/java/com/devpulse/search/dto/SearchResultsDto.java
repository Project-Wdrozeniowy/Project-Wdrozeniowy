package com.devpulse.search.dto;

import com.devpulse.common.dto.PagedResponse;
import com.devpulse.forum.dto.PostSummaryDto;
import com.devpulse.forum.dto.TagDto;
import com.devpulse.user.dto.UserSummaryDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Results of {@code GET /search}: one page per kind of result. A kind left
 * out by the {@code type} filter is {@code null}.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Search results, one page per kind; a kind left out by the type filter is null")
public class SearchResultsDto {

    @Schema(description = "The query as it was matched, without surrounding whitespace", example = "spring")
    private String query;

    @Schema(description = "Published and locked posts whose title or content contains the query, "
            + "most recent activity first; navigate with the slug", nullable = true)
    private PagedResponse<PostSummaryDto> posts;

    @Schema(description = "Active users whose username or display name contains the query, "
            + "by username; navigate with the username", nullable = true)
    private PagedResponse<UserSummaryDto> users;

    @Schema(description = "Tags in use whose name contains the query, most used first; "
            + "navigate with the slug", nullable = true)
    private PagedResponse<TagDto> tags;
}
