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
@Schema(description = "Public posts and comments created from start (inclusive) to end (exclusive)")
public class PublicActivityWindowDto {

    @Schema(description = "Start of the window, inclusive", example = "2026-11-05T00:00:00Z")
    private OffsetDateTime start;

    @Schema(description = "End of the window, exclusive", example = "2026-11-11T14:30:00Z")
    private OffsetDateTime end;

    @Schema(description = "Public posts created in the window", example = "31")
    private long posts;

    @Schema(description = "Visible comments on public posts created in the window", example = "87")
    private long comments;
}
