package com.devpulse.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for {@code POST /auth/logout}.
 *
 * <p>Carries the refresh token the client wants to invalidate. The endpoint
 * is idempotent — an unknown token returns 200 without revealing token state.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LogoutRequest {

    /** The refresh token to revoke. */
    @NotBlank
    private String refreshToken;
}
