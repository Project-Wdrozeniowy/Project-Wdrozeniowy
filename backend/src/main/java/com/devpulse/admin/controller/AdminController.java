package com.devpulse.admin.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Administration endpoints, restricted to users with the {@code ADMIN} role.
 *
 * <p>Acts as the entry point for administrative actions on the forum.
 * Access is enforced via {@link PreAuthorize} on each handler — anonymous
 * or non-admin requests receive HTTP 403 (handled by
 * {@link com.devpulse.exception.GlobalExceptionHandler}).
 */
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
    @GetMapping("/ping")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> ping() {
        return Map.of("status", "ok", "scope", "admin");
    }
}
