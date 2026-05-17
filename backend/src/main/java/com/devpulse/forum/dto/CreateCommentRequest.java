package com.devpulse.forum.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCommentRequest(
        @NotBlank(message = "Content must not be blank")
        @Size(max = 10_000, message = "Content must not exceed 10000 characters")
        String content,

        Long parentId
) {}
