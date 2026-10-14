package com.devpulse.admin.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Administration endpoints, restricted to users with the {@code ADMIN} role.
 *
 * <p>Acts as the entry point for administrative actions on the forum.
 * Anonymous requests are rejected by the security filter chain with HTTP 401
 * (see {@link com.devpulse.config.SecurityConfig}). Authenticated users without
 * the {@code ADMIN} role are rejected by {@link PreAuthorize} on each handler
 * with HTTP 403 (handled by {@link com.devpulse.exception.GlobalExceptionHandler}).
 */
@Tag(name = "Admin", description = "Administration endpoints, ADMIN role only")
@RestController
@RequestMapping("/admin")
public class AdminController {

    /**
     * Health-style endpoint used to verify that the caller is authenticated
     * <em>and</em> has the {@code ADMIN} role. Useful for the frontend route
     * guard to detect whether the current user may access the admin area.
     *
     * @return a small JSON payload confirming admin access; HTTP 200
     */
    @Operation(summary = "Check that the caller has admin access", security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Caller is an admin; body is {\"status\": \"ok\", \"scope\": \"admin\"}"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Admin role required")
    })
    @GetMapping("/ping")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> ping() {
        return Map.of("status", "ok", "scope", "admin");
    }
}
