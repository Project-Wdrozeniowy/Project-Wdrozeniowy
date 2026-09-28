package com.devpulse.auth.controller;

import com.devpulse.auth.dto.AuthRequest;
import com.devpulse.auth.dto.AuthResponse;
import com.devpulse.auth.dto.LogoutRequest;
import com.devpulse.auth.dto.RefreshRequest;
import com.devpulse.auth.dto.RegisterRequest;
import com.devpulse.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
 *   <li>{@code POST /auth/refresh}  — refresh the access token</li>
 *   <li>{@code POST /auth/logout}   — revoke the refresh token</li>
 * </ul>
 */
@Tag(name = "Auth", description = "Registration, login, token management")
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
    @Operation(summary = "Register a new account")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Registered successfully"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "409", description = "Username or email already taken")
    })
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
    @Operation(summary = "Login and receive token pair")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Authenticated successfully"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Bad credentials")
    })
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AuthRequest request) {
        return authService.login(request);
    }

    /**
     * Refreshes the access token using a valid refresh token.
     *
     * @param request object containing the refresh token
     * @return {@link AuthResponse} with a new access token; HTTP 200
     */
    @Operation(summary = "Refresh the access token")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Token refreshed"),
        @ApiResponse(responseCode = "401", description = "Refresh token is invalid or expired")
    })
    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request.getRefreshToken());
    }

    /**
     * Revokes the given refresh token, effectively logging out the user.
     *
     * @param request object containing the refresh token to revoke
     */
    @Operation(summary = "Logout — revoke refresh token",
            description = "Revokes the supplied refresh token. No access token is required; the refresh token itself acts as the credential.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Logged out"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "401", description = "Refresh token not found")
    })
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request.getRefreshToken());
    }
}
