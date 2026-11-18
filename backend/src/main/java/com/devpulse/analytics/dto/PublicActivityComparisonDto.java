package com.devpulse.analytics.dto;

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
@Schema(description = "Public activity of the current window against the window of the same length right before "
        + "it. The current window is that of the public activity up to generatedAt, so its figures equal the "
        + "activity totals; the previous one ends where it starts, with no gap or overlap, and lasts exactly as "
        + "long, so the partial current day is matched by an equal span. Figures count the records that are "
        + "public now, so hiding a post later lowers both windows.")
public class PublicActivityComparisonDto {

    @Schema(description = "Requested window", example = "7d", allowableValues = {"7d", "30d"})
    private String period;

    @Schema(description = "When these figures were read; the end of the current window",
            example = "2026-11-11T14:30:00Z")
    private OffsetDateTime generatedAt;

    @Schema(description = "From 00:00 UTC of the first of the period's days, the current one being the last, "
            + "to generatedAt")
    private PublicActivityWindowDto current;

    @Schema(description = "The equally long window ending at current.start")
    private PublicActivityWindowDto previous;

    @Schema(description = "Public posts: current against previous")
    private ActivityChangeDto posts;

    @Schema(description = "Visible comments on public posts: current against previous")
    private ActivityChangeDto comments;
}
