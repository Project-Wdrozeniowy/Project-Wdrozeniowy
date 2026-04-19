package com.devpulse.auth.dto;

import lombok.Builder;
import lombok.Data;

/**
 * DTO returned after successful authentication.
 *
 * <p>Returned by {@code POST /auth/register}, {@code POST /auth/login},
 * and {@code POST /auth/refresh}.
 *
 * <p>Example JSON response:
 * <pre>
 * {
 *   "accessToken":  "eyJhbGciOiJIUzI1NiJ9...",
 *   "refreshToken": "a1b2c3d4e5f6...",
 *   "tokenType":    "Bearer",
 *   "expiresIn":    900
 * }
 * </pre>
 */
@Data
@Builder
public class AuthResponse {

    /**
     * Signed JWT for authenticating requests.
     * Sent in the {@code Authorization: Bearer <accessToken>} header.
     */
    private String accessToken;

    /**
     * Opaque token used to refresh the access token.
     * Sent to {@code POST /auth/refresh} after the access token expires.
     */
    private String refreshToken;

    /**
     * Token type per OAuth 2.0 specification.
     * Always {@code "Bearer"}.
     */
    @Builder.Default
    private String tokenType = "Bearer";

    /**
     * Access token lifetime in seconds from issuance.
     * Default: 900 s (15 minutes).
     */
    private long expiresIn;
}
