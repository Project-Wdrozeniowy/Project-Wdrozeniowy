package com.devpulse.user.dto;

import com.devpulse.auth.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * Response payload for {@code GET /users/{username}} — the publicly visible
 * portion of a user's profile. Excludes email, status and ban reason.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicProfileResponse {

    private Long id;
    private String username;
    private String displayName;
    private String avatarUrl;
    private String bio;
    private Integer postCount;
    private Integer commentCount;
    private OffsetDateTime createdAt;

    /** Builds a {@link PublicProfileResponse} from a {@link User} entity. */
    public static PublicProfileResponse from(User user) {
        return PublicProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .postCount(user.getPostCount())
                .commentCount(user.getCommentCount())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
