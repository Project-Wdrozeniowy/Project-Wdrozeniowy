package com.devpulse.analytics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "One figure in the current window against the previous one")
public class ActivityChangeDto {

    @Schema(description = "Value in the current window", example = "31")
    private long current;

    @Schema(description = "Value in the previous window", example = "24")
    private long previous;

    @Schema(description = "current - previous; negative for a decrease", example = "7")
    private long change;

    @Schema(description = "change / previous × 100, rounded half up to 1 decimal; null when previous is 0, "
            + "since growth from nothing has no percentage", example = "29.2", nullable = true)
    private BigDecimal changePercent;
}
