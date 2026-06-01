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
@Schema(description = "A single data point in a time-series trend")
public class TrendDataPointDto {

    @Schema(description = "Date of the data point", example = "2026-05-07")
    private LocalDate date;

    @Schema(description = "Count of events on this date", example = "42")
    private long count;
}
