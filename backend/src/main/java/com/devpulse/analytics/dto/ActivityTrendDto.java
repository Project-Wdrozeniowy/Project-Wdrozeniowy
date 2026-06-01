package com.devpulse.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Time-series trend for a single activity metric")
public class ActivityTrendDto {

    @Schema(description = "Metric being tracked", example = "posts",
            allowableValues = {"posts", "comments", "votes", "users"})
    private String metric;

    @Schema(description = "Time period of the trend", example = "7d",
            allowableValues = {"24h", "7d", "30d", "90d"})
    private String period;

    @Schema(description = "Total count across the entire period", example = "314")
    private long total;

    @Schema(description = "Ordered list of daily counts for the requested period")
    private List<TrendDataPointDto> data;
}
