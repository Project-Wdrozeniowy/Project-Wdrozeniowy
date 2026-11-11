package com.devpulse.analytics.dto;

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
@Schema(description = "Daily public platform activity. Figures count the records that are public now and were "
        + "created in the window, so hiding a post later lowers past days.")
public class PublicActivityDto {

    @Schema(description = "Requested window", example = "7d", allowableValues = {"7d", "30d"})
    private String period;

    @Schema(description = "Start of the first UTC day, inclusive", example = "2026-11-05T00:00:00Z")
    private OffsetDateTime windowStart;

    @Schema(description = "Start of the UTC day after the last one, exclusive", example = "2026-11-12T00:00:00Z")
    private OffsetDateTime windowEnd;

    @Schema(description = "When these figures were read; the current UTC day counts up to this moment",
            example = "2026-11-11T14:30:00Z")
    private OffsetDateTime generatedAt;

    @Schema(description = "Public posts created in the window", example = "31")
    private long totalPosts;

    @Schema(description = "Visible comments on public posts created in the window", example = "87")
    private long totalComments;

    @Schema(description = "One row per UTC day, oldest first and ending with the current day; "
            + "as many rows as the window has days")
    private List<PublicActivityDayDto> days;
}
