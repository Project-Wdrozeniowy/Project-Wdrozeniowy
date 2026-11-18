package com.devpulse.ai.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@Schema(description = "Request body for tag suggestions")
public class SuggestTagsRequest {

    @NotBlank(message = "Content must not be blank")
    @Size(min = 10, max = 50_000, message = "Content must be between {min} and {max} characters")
    @Schema(description = "Post content to analyse",
            example = "How to configure Spring Boot with PostgreSQL and Flyway migrations")
    private String content;

    @Size(max = 255, message = "Title must be at most {max} characters")
    @Schema(description = "Optional post title; its words weigh more than the content's",
            example = "Spring Boot + PostgreSQL setup")
    private String title;
}
