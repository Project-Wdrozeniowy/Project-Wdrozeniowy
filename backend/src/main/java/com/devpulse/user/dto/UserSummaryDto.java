package com.devpulse.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Compact user representation used in nested objects")
public class UserSummaryDto {

    @Schema(description = "User ID", example = "42")
    private Long id;

    @Schema(description = "Unique username", example = "johndoe")
    private String username;

    @Schema(description = "Display name shown in the UI", example = "John Doe")
    private String displayName;

    @Schema(description = "URL of the user's avatar image")
    private String avatarUrl;

    @Schema(description = "User role", example = "USER", allowableValues = {"USER", "MODERATOR", "ADMIN"})
    private String role;
}
