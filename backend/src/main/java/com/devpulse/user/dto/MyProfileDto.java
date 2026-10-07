package com.devpulse.user.dto;

import com.devpulse.auth.entity.User;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * The caller's own profile: the public profile plus the fields only the
 * owner may see.
 */
@Getter
@SuperBuilder
@NoArgsConstructor
@Schema(description = "Own profile — the public profile plus private account fields")
public class MyProfileDto extends UserProfileDto {

    @Schema(description = "Email address", example = "johndoe@example.com")
    private String email;

    /** Builds the own profile of {@code user}. */
    public static MyProfileDto from(User user) {
        return fill(MyProfileDto.builder(), user)
                .email(user.getEmail())
                .build();
    }
}
