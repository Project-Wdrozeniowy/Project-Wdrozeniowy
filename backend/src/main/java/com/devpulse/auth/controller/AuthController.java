package com.devpulse.auth.controller;

import com.devpulse.auth.dto.AuthRequest;
import com.devpulse.auth.dto.AuthResponse;
import com.devpulse.auth.dto.RegisterRequest;
import com.devpulse.auth.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller handling authentication endpoints.
 *
 * <p>The refresh token is never exposed in response bodies — it travels
 * exclusively as an {@code HttpOnly} cookie to prevent XSS theft.
 *
 * <p>Available routes:
 * <ul>
 *   <li>{@code POST /auth/register} — create a new account</li>
 *   <li>{@code POST /auth/login}    — log in</li>
 *   <li>{@code POST /auth/refresh}  — exchange refresh cookie for new access token</li>
 *   <li>{@code GET  /auth/me}       — restore session from refresh cookie</li>
 *   <li>{@code POST /auth/logout}   — invalidate session and clear cookie</li>
 * </ul>
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletResponse response) {
        return authService.register(request, response);
    }

    @PostMapping("/login")
    public AuthResponse login(
            @Valid @RequestBody AuthRequest request,
            HttpServletResponse response) {
        return authService.login(request, response);
    }

    /**
     * Refreshes the access token.
     * The refresh token is read from the {@code refreshToken} HttpOnly cookie.
     */
    @PostMapping("/refresh")
    public AuthResponse refresh(
            @CookieValue(name = AuthService.REFRESH_COOKIE_NAME, required = false) String refreshToken,
            HttpServletResponse response) {
        return authService.refresh(refreshToken, response);
    }

    /**
     * Restores a session on page load using the refresh cookie.
     * Returns the current user and a fresh access token.
     */
    @GetMapping("/me")
    public AuthResponse me(
            @CookieValue(name = AuthService.REFRESH_COOKIE_NAME, required = false) String refreshToken,
            HttpServletResponse response) {
        return authService.me(refreshToken, response);
    }

    /**
     * Logs out the user — deletes the refresh token from the DB and clears the cookie.
     */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(
            @CookieValue(name = AuthService.REFRESH_COOKIE_NAME, required = false) String refreshToken,
            HttpServletResponse response) {
        authService.logout(refreshToken, response);
    }
}
