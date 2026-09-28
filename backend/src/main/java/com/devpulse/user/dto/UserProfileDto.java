package com.devpulse.user.dto;

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
@Schema(description = "Full public user profile")
public class UserProfileDto {

    @Schema(description = "User ID", example = "42")
    private Long id;

    @Schema(description = "Unique username", example = "johndoe")
    private String username;

    @Schema(description = "Display name", example = "John Doe")
    private String displayName;

    @Schema(description = "URL of the avatar image")
    private String avatarUrl;

    @Schema(description = "User bio")
    private String bio;

    @Schema(description = "User role", example = "USER", allowableValues = {"USER", "MODERATOR", "ADMIN"})
    private String role;

    @Schema(description = "Account status", example = "ACTIVE", allowableValues = {"ACTIVE", "BANNED", "DEACTIVATED"})
    private String status;

    @Schema(description = "Number of posts created by the user")
    private int postCount;

    @Schema(description = "Number of comments written by the user")
    private int commentCount;

    @Schema(description = "Account creation timestamp")
    private OffsetDateTime createdAt;
}
