package com.devpulse.auth.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Builder;
import lombok.Data;

/**
 * DTO returned after successful authentication.
 *
 * <p>Returned by {@code POST /auth/register}, {@code POST /auth/login},
 * and {@code POST /auth/refresh}.
 *
 * <p>The refresh token is deliberately not part of the JSON body: the controller
 * delivers it as an {@code HttpOnly} cookie.
 *
 * <p>Example JSON response:
 * <pre>
 * {
 *   "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
 *   "tokenType":   "Bearer",
 *   "expiresIn":   900
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
     * Opaque refresh token. Never serialized: the controller moves it into the
     * {@code refreshToken} cookie.
     */
    @JsonIgnore
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
