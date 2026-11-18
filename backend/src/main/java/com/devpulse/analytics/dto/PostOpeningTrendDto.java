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
@Schema(description = "Daily intentional openings of one of the caller's posts, over the window of the public "
        + "activity. Counts openings only: no reader, visitor or demographic data.")
public class PostOpeningTrendDto {

    @Schema(description = "Post ID", example = "101")
    private Long postId;

    @Schema(description = "Requested window", example = "7d", allowableValues = {"7d", "30d"})
    private String period;

    @Schema(description = "Start of the first UTC day, inclusive", example = "2026-11-05T00:00:00Z")
    private OffsetDateTime windowStart;

    @Schema(description = "Start of the UTC day after the last one, exclusive", example = "2026-11-12T00:00:00Z")
    private OffsetDateTime windowEnd;

    @Schema(description = "When these figures were read; the current UTC day counts up to this moment",
            example = "2026-11-11T14:30:00Z")
    private OffsetDateTime generatedAt;

    @Schema(description = "Openings are collected from this instant on; days that ended before it are not measured",
            example = "2026-11-08T10:15:00Z")
    private OffsetDateTime collectedFrom;

    @Schema(description = "Openings on the measured days of the window", example = "27")
    private long totalOpenings;

    @Schema(description = "One row per UTC day, oldest first and ending with the current day; "
            + "as many rows as the window has days")
    private List<PostOpeningDayDto> days;
}
