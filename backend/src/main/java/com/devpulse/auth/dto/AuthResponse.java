package com.devpulse.auth.dto;

import lombok.Builder;
import lombok.Data;

/**
 * DTO returned after successful authentication or session restore.
 *
 * <p>Returned by {@code POST /auth/register}, {@code POST /auth/login},
 * {@code POST /auth/refresh}, and {@code GET /auth/me}.
 *
 * <p>The refresh token is no longer included in the JSON body — it is
 * delivered as an {@code HttpOnly} cookie by the server.
 *
 * <p>Example JSON response:
 * <pre>
 * {
 *   "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
 *   "tokenType":   "Bearer",
 *   "expiresIn":   900,
 *   "user":        { "id": 1, "username": "alice", "email": "alice@example.com", "role": "USER" }
 * }
 * </pre>
 */
@Data
@Builder
public class AuthResponse {

    /** Signed JWT for authenticating API requests via {@code Authorization: Bearer}. */
    private String accessToken;

    /** Token type per OAuth 2.0 — always {@code "Bearer"}. */
    @Builder.Default
    private String tokenType = "Bearer";

    /** Access token lifetime in seconds from issuance (default 900 s = 15 min). */
    private long expiresIn;

    /** Authenticated user's public information. */
    private UserInfo user;
}
