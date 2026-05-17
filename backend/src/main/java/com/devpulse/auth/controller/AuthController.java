package com.devpulse.auth.controller;

import com.devpulse.auth.dto.AuthRequest;
import com.devpulse.auth.dto.AuthResponse;
import com.devpulse.auth.dto.LogoutRequest;
import com.devpulse.auth.dto.RefreshRequest;
import com.devpulse.auth.dto.RegisterRequest;
import com.devpulse.auth.service.AuthService;
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
 * <p>Available routes:
 * <ul>
 *   <li>{@code POST /auth/register} — register a new account</li>
 *   <li>{@code POST /auth/login}    — log in and receive a token pair</li>
 *   <li>{@code POST /auth/refresh}  — refresh the access token (rotates the refresh token)</li>
 *   <li>{@code POST /auth/logout}   — revoke a refresh token</li>
 * </ul>
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Registers a new user.
     *
     * @param request validated registration data
     * @return {@link AuthResponse} containing access and refresh tokens; HTTP 201
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    /**
     * Logs in a user and returns a pair of JWT tokens.
     *
     * @param request login credentials (username, password)
     * @return {@link AuthResponse} containing access and refresh tokens; HTTP 200
     */
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AuthRequest request) {
        return authService.login(request);
    }

    /**
     * Refreshes the access token using a valid refresh token.
     *
     * <p>The refresh token is rotated: the presented value is invalidated
     * and the response contains a new access/refresh token pair.
     *
     * @param request object containing the refresh token
     * @return {@link AuthResponse} with a new access and refresh token; HTTP 200
     */
    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request.getRefreshToken());
    }

    /**
     * Logs the caller out by revoking the given refresh token.
     *
     * <p>Idempotent — unknown or already-revoked tokens return 204 without
     * disclosing whether the token existed.
     *
     * @param request object containing the refresh token to revoke
     */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request.getRefreshToken());
    }
}
