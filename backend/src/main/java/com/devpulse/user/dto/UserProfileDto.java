package com.devpulse.user.dto;

import com.devpulse.auth.entity.User;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;

@Getter
@SuperBuilder
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

    /** Builds the public profile of {@code user}. */
    public static UserProfileDto from(User user) {
        return fill(UserProfileDto.builder(), user).build();
    }

    /** Copies the public profile fields of {@code user} into {@code builder}. */
    static <B extends UserProfileDtoBuilder<?, ?>> B fill(B builder, User user) {
        builder.id(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .role(user.getRole().name())
                .status(user.getStatus().name())
                .postCount(user.getPostCount())
                .commentCount(user.getCommentCount())
                .createdAt(user.getCreatedAt());
        return builder;
    }
}
