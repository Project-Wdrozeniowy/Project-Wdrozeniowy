package com.devpulse.ai.dto;

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
@Schema(description = "AI-generated tag suggestions for a piece of content")
public class SuggestTagsResponse {

    @Schema(description = "Suggested tag slugs, ordered by confidence (highest first)",
            example = "[\"spring-boot\", \"postgresql\", \"flyway\", \"java\"]")
    private List<String> tags;

    @Schema(description = "Whether the response was served from the AI provider or a local fallback",
            example = "true")
    private boolean aiGenerated;
}
