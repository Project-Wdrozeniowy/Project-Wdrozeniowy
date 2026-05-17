package com.devpulse.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for {@code PATCH /users/me}.
 *
 * <p>All fields are optional — a {@code null} value means "leave unchanged".
 * Validation is applied only when a value is present.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {

    /** New email address — must be unique across the {@code users} table. */
    @Email
    @Size(max = 100)
    private String email;

    /** New public display name (1..100 characters). */
    @Size(min = 1, max = 100)
    private String displayName;

    /** New avatar URL (max 500 characters). */
    @Size(max = 500)
    private String avatarUrl;

    /** New biography (max 2000 characters to keep the payload reasonable). */
    @Size(max = 2000)
    private String bio;
}
