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
@Schema(description = "Public posts and comments created on one UTC day; 0 means none, not missing data")
public class PublicActivityDayDto {

    @Schema(description = "UTC day", example = "2026-11-05")
    private LocalDate date;

    @Schema(description = "Public posts created on this day", example = "4")
    private long posts;

    @Schema(description = "Visible comments on public posts created on this day", example = "12")
    private long comments;
}
