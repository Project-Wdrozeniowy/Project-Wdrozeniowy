package com.devpulse.ai.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "Request body for AI tag suggestions")
public class SuggestTagsRequest {

    @NotBlank
    @Size(min = 10, max = 50_000)
    @Schema(description = "Post content or title to analyse for tag suggestions",
            example = "How to configure Spring Boot with PostgreSQL and Flyway migrations")
    private String content;

    @Size(max = 20)
    @Schema(description = "Optional post title — improves suggestion accuracy", example = "Spring Boot + PostgreSQL setup")
    private String title;
}
