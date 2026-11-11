package com.devpulse.forum.dto;

import com.devpulse.common.validation.ValidationPatterns;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "One intentional opening of a post")
public class RecordPostOpeningRequest {

    @NotNull(message = "openingId is required")
    @Pattern(regexp = ValidationPatterns.UUID, message = "openingId must be a UUID")
    @Schema(description = "Random id the client creates for this opening and reuses only when retrying it; "
            + "it must not identify the reader or be kept between openings",
            format = "uuid", example = "3f0a7c52-9d1e-4b6a-8a43-2f6c1e7b9d10")
    private String openingId;
}
