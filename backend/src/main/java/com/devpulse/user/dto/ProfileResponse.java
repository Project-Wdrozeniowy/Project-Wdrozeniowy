package com.devpulse.user.dto;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.entity.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * Response payload for {@code GET /users/me} — full profile of the
 * authenticated user, including private fields such as email and status.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileResponse {

    private Long id;
    private String username;
    private String email;
    private String displayName;
    private String avatarUrl;
    private String bio;
    private Role role;
    private UserStatus status;
    private Integer postCount;
    private Integer commentCount;
    private OffsetDateTime createdAt;

    /** Builds a {@link ProfileResponse} from a {@link User} entity. */
    public static ProfileResponse from(User user) {
        return ProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .role(user.getRole())
                .status(user.getStatus())
                .postCount(user.getPostCount())
                .commentCount(user.getCommentCount())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
