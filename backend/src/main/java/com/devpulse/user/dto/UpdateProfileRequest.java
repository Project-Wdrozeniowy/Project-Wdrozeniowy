package com.devpulse.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.URL;

/**
 * Request payload for {@code PATCH /users/me}.
 *
 * <p>All fields are optional — a {@code null} value means "leave unchanged".
 * Validation is applied only when a value is present.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request body for updating own profile (all fields optional)")
public class UpdateProfileRequest {

    /** New email address — must be unique across the {@code users} table. */
    @Email
    @Size(max = 100)
    @Schema(description = "New email address — must not be used by another account")
    private String email;

    /** New public display name (1..100 characters). */
    @Size(min = 1, max = 100)
    @Schema(description = "New display name")
    private String displayName;

    /** New avatar URL (max 500 characters). */
    @URL
    @Size(max = 500)
    @Schema(description = "New avatar URL — must be a valid HTTP/HTTPS URL")
    private String avatarUrl;

    /** New biography (max 2000 characters to keep the payload reasonable). */
    @Size(max = 2000)
    @Schema(description = "New bio text")
    private String bio;
}
