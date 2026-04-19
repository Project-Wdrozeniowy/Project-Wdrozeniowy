package com.devpulse.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO for a user login request.
 *
 * <p>Used by {@code POST /auth/login}. Both fields are required.
 *
 * <p>Example JSON request:
 * <pre>
 * {
 *   "username": "ivan_petrov",
 *   "password": "Secret123!"
 * }
 * </pre>
 */
@Data
public class AuthRequest {

    /** Username registered in the system. */
    @NotBlank
    private String username;

    /** Plain-text password — verified via BCrypt. */
    @NotBlank
    private String password;
}
