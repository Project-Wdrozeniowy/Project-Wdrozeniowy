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

    /** New public display name (max 100 characters); an empty string clears it. */
    @Size(max = 100)
    @Schema(description = "New display name; an empty string clears it")
    private String displayName;

    /** New avatar URL (max 500 characters); an empty string clears it. */
    @URL
    @Size(max = 500)
    @Schema(description = "New avatar URL — must be a valid HTTP/HTTPS URL; an empty string clears it")
    private String avatarUrl;

    /** New biography (max 1000 characters, as agreed in the API contract); an empty string clears it. */
    @Size(max = 1000)
    @Schema(description = "New bio text; an empty string clears it")
    private String bio;
}
