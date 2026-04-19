package com.devpulse.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO for an access token refresh request.
 *
 * <p>Used by {@code POST /auth/refresh}.
 * The client sends the refresh token received during login or registration.
 *
 * <p>Example JSON request:
 * <pre>
 * {
 *   "refreshToken": "a1b2c3d4e5f6..."
 * }
 * </pre>
 */
@Data
public class RefreshRequest {

    /**
     * Refresh token value — must match the token stored in the database.
     * Non-blank string; validated via {@link NotBlank}.
     */
    @NotBlank
    private String refreshToken;
}
