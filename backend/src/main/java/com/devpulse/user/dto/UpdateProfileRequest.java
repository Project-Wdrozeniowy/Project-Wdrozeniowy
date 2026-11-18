package com.devpulse.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.URL;

import static com.devpulse.common.validation.ValidationPatterns.NOT_BLANK;

/**
 * Request payload for {@code PATCH /users/me}.
 *
 * <p>All fields are optional — a {@code null} value means "leave unchanged".
 * Validation is applied only when a value is present. An email cannot be
 * cleared, so a blank one is rejected; the other fields are cleared by an
 * empty string. The messages name the field and are written to be shown to
 * the user.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request body for updating own profile (all fields optional)")
public class UpdateProfileRequest {

    /** New email address — must be unique across the {@code users} table; it cannot be blank. */
    @Pattern(regexp = NOT_BLANK, message = "Email must not be blank")
    @Email(message = "Email must be a valid email address")
    @Size(max = 100, message = "Email must be at most {max} characters")
    @Schema(description = "New email address — must not be blank or used by another account", format = "email")
    private String email;

    /** New public display name (max 100 characters); an empty string clears it. */
    @Size(max = 100, message = "Display name must be at most {max} characters")
    @Schema(description = "New display name; an empty string clears it")
    private String displayName;

    /** New avatar URL (max 500 characters, http or https only); an empty string clears it. */
    @URL(regexp = "(https?://.*)?", flags = Pattern.Flag.CASE_INSENSITIVE,
            message = "Avatar URL must be a valid http or https URL")
    @Size(max = 500, message = "Avatar URL must be at most {max} characters")
    @Schema(description = "New avatar URL — must be a valid HTTP/HTTPS URL; an empty string clears it")
    private String avatarUrl;

    /** New biography (max 1000 characters, as agreed in the API contract); an empty string clears it. */
    @Size(max = 1000, message = "Bio must be at most {max} characters")
    @Schema(description = "New bio text; an empty string clears it")
    private String bio;
}
