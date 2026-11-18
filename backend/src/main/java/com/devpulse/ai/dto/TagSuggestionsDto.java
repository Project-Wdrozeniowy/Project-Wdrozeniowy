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
@Schema(description = "Tag suggestions for a piece of content")
public class TagSuggestionsDto {

    @Schema(description = "Suggested tag slugs, best first, at most 5; existing tags or, from keyword extraction, "
            + "new ones that pass the post tag rules",
            example = "[\"spring-boot\", \"postgresql\", \"flyway\", \"java\"]")
    private List<String> tags;

    @Schema(description = "true when the AI provider chose the tags (always existing ones); false when they come "
            + "from keyword extraction because the provider is not configured, failed or chose none",
            example = "true")
    private boolean aiGenerated;
}
