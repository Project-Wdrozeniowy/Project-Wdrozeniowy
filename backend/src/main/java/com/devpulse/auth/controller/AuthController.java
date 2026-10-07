package com.devpulse.auth.controller;

import com.devpulse.auth.cookie.RefreshTokenCookies;
import com.devpulse.auth.dto.AuthRequest;
import com.devpulse.auth.dto.AuthResponse;
import com.devpulse.auth.dto.RegisterRequest;
import com.devpulse.auth.service.AuthService;
import com.devpulse.exception.AppException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller handling authentication endpoints.
 *
 * <p>All endpoints in this controller are public (configured
 * in {@link com.devpulse.config.SecurityConfig}).
 *
 * <p>The refresh token never appears in a response body or request body. It is
 * stored in an {@code HttpOnly} cookie ({@link RefreshTokenCookies}) so JavaScript
 * cannot read it.
 *
 * <p>Available routes:
 * <ul>
 *   <li>{@code POST /auth/register} — register a new account</li>
 *   <li>{@code POST /auth/login}    — log in; sets the refresh cookie</li>
 *   <li>{@code POST /auth/refresh}  — new access token from the refresh cookie (rotates the cookie)</li>
 *   <li>{@code POST /auth/logout}   — revoke the refresh token and clear the cookie</li>
 * </ul>
 */
@Tag(name = "Auth", description = "Registration, login, token management")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenCookies refreshTokenCookies;

    /**
     * Registers a new user.
     *
     * @param request validated registration data
     * @return {@link AuthResponse} with the access token; the refresh token is set as a cookie; HTTP 201
     */
    @Operation(summary = "Register a new account")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Registered successfully"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "409", description = "Username or email already taken")
    })
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        return withRefreshCookie(authService.register(request), response);
    }

    /**
     * Logs in a user.
     *
     * @param request login credentials (username, password)
     * @return {@link AuthResponse} with the access token; the refresh token is set as a cookie; HTTP 200
     */
    @Operation(summary = "Login and receive an access token")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Authenticated successfully"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Bad credentials")
    })
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AuthRequest request, HttpServletResponse response) {
        return withRefreshCookie(authService.login(request), response);
    }

    /**
     * Issues a new access token from the refresh cookie and rotates the cookie.
     *
     * <p>Also used to restore a session on page load, since the access token only
     * lives in browser memory. On failure the stale cookie is cleared.
     *
     * @param refreshToken the {@code refreshToken} cookie, if present
     * @return {@link AuthResponse} with a new access token; HTTP 200
     */
    @Operation(summary = "Refresh the access token using the refresh cookie")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Token refreshed"),
        @ApiResponse(responseCode = "401", description = "Refresh cookie missing, invalid or expired")
    })
    @PostMapping("/refresh")
    public AuthResponse refresh(
            @CookieValue(name = RefreshTokenCookies.NAME, required = false) String refreshToken,
            HttpServletResponse response) {
        try {
            return withRefreshCookie(authService.refresh(refreshToken), response);
        } catch (AppException e) {
            if (e.getStatus() == HttpStatus.UNAUTHORIZED) {
                refreshTokenCookies.clear(response);
            }
            throw e;
        }
    }

    /**
     * Logs the caller out by revoking the refresh token and clearing the cookie.
     *
     * <p>Idempotent — a missing, unknown or already-revoked token still returns 204
     * without disclosing whether the token existed.
     *
     * @param refreshToken the {@code refreshToken} cookie, if present
     */
    @Operation(summary = "Logout — revoke the refresh token and clear the cookie",
            description = "The refresh cookie itself acts as the credential, so no access token is required. "
                    + "Idempotent: a missing, unknown or already-revoked token also returns 204.")
    @ApiResponse(responseCode = "204", description = "Logged out")
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(
            @CookieValue(name = RefreshTokenCookies.NAME, required = false) String refreshToken,
            HttpServletResponse response) {
        authService.logout(refreshToken);
        refreshTokenCookies.clear(response);
    }

    private AuthResponse withRefreshCookie(AuthResponse authResponse, HttpServletResponse response) {
        refreshTokenCookies.write(response, authResponse.getRefreshToken());
        return authResponse;
    }
}
