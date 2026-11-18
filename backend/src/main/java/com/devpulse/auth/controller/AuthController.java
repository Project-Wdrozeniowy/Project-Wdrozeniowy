package com.devpulse.auth.controller;

import com.devpulse.auth.dto.AuthRequest;
import com.devpulse.auth.dto.RegisterRequest;
import com.devpulse.auth.session.SessionLifecycle;
import com.devpulse.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Auth", description = "Session authentication and CSRF bootstrap")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;
    private final SessionLifecycle sessions;

    public record CsrfResponse(String token, String headerName) {}

    @Operation(summary = "Obtain the session-backed CSRF token")
    @GetMapping("/csrf")
    public CsrfResponse csrf(@io.swagger.v3.oas.annotations.Parameter(hidden = true) CsrfToken csrf,
                             HttpServletRequest request, HttpServletResponse response) {
        sessions.prepare(request, response);
        response.setHeader("Cache-Control", "no-store");
        return new CsrfResponse(csrf.getToken(), csrf.getHeaderName());
    }

    @Operation(summary = "Register and establish a server session")
    @ApiResponses({@ApiResponse(responseCode = "201", description = "Registered; session cookie set, no token payload"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "403", description = "Invalid CSRF token"),
            @ApiResponse(responseCode = "409", description = "Username or email already registered")})
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public void register(@Valid @RequestBody RegisterRequest input, HttpServletRequest request,
                         HttpServletResponse response) {
        auth.register(input, request, response);
    }

    @Operation(summary = "Login and establish an independent server session")
    @ApiResponses({@ApiResponse(responseCode = "204", description = "Authenticated; session cookie set"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "401", description = "Authentication failed"),
            @ApiResponse(responseCode = "403", description = "Invalid CSRF token or stale authentication context")})
    @PostMapping("/login")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void login(@Valid @RequestBody AuthRequest input, HttpServletRequest request,
                      HttpServletResponse response) {
        auth.login(input, request, response);
    }

    @Operation(summary = "Invalidate the current server session", description = "Requires CSRF, including for guests")
    @ApiResponses({@ApiResponse(responseCode = "204", description = "Session invalidated; cookie cleared"),
            @ApiResponse(responseCode = "403", description = "Invalid CSRF token")})
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        sessions.logout(request, response);
    }
}
