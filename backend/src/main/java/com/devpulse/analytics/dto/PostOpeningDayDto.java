package com.devpulse.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Openings of the post on one UTC day. A measured day with no openings has openings 0; a day "
        + "that ended before openings were collected is not measured and has openings null.")
public class PostOpeningDayDto {

    @Schema(description = "UTC day", example = "2026-11-05")
    private LocalDate date;

    @Schema(description = "Whether openings were being collected on this day; the day collection started counts "
            + "from collectedFrom")
    private boolean measured;

    @Schema(description = "Intentional openings on this day; null when the day is not measured", example = "4",
            nullable = true)
    private Long openings;
}
